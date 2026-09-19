"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { checkPassword, endSession, requireAdmin, startSession } from "@/lib/auth";
import { configProblems } from "@/lib/configCheck";
import { clientIp, minutes, recordHit, retryAfterSeconds } from "@/lib/rateLimit";
import { db } from "@/lib/db";
import { removeImage, saveImage } from "@/lib/uploads";

const LOGIN_WINDOW = 15 * 60_000;

export async function login(_: string | null, form: FormData) {
  if (process.env.NODE_ENV === "production") {
    const problems = configProblems(process.env);
    if (problems.length > 0) {
      console.error("Unsafe production config:", problems.join("; "));
      return "השרת לא מוגדר בצורה בטוחה (ראה את יומן השרת)";
    }
  }
  // Per-IP limit on failed attempts, plus a global one against guessing spread over many IPs.
  const ip = await clientIp();
  const ipWait = await retryAfterSeconds(`login:${ip}`, 5, LOGIN_WINDOW);
  const allWait = await retryAfterSeconds("login:all", 30, 60 * 60_000);
  const wait = Math.max(ipWait, allWait);
  if (wait > 0) return `יותר מדי ניסיונות. נסו שוב בעוד ${minutes(wait)} דקות.`;

  if (!checkPassword(String(form.get("password") ?? ""))) {
    await recordHit(`login:${ip}`);
    await recordHit("login:all");
    return "סיסמה שגויה";
  }
  await startSession();
  redirect("/admin/products");
}

export async function logout() {
  await endSession();
  redirect("/admin/login");
}

function num(form: FormData, key: string) {
  const v = Number(form.get(key));
  if (!Number.isFinite(v)) throw new Error(`ערך לא תקין: ${key}`);
  return v;
}

function productData(form: FormData) {
  const bottleSizeMl = Math.round(num(form, "bottleSizeMl"));
  const marketValuePerBottle = num(form, "marketValuePerBottle");
  const brand = String(form.get("brand") ?? "").trim();
  const name = String(form.get("name") ?? "").trim();
  if (!brand || !name) throw new Error("חובה למלא מותג ושם");
  if (bottleSizeMl <= 0) throw new Error("גודל בקבוק חייב להיות חיובי");
  if (marketValuePerBottle <= 0) throw new Error("ערך שוק חייב להיות חיובי");
  return {
    brand,
    name,
    description: String(form.get("description") ?? "").trim(),
    bottleSizeMl,
    marketValuePerBottle,
    isActive: form.get("isActive") === "on",
  };
}

export async function saveProduct(id: number | null, _: string | null, form: FormData) {
  await requireAdmin();
  let data;
  let imageUrl: string | null;
  try {
    data = productData(form);
    imageUrl = await saveImage(form.get("image"));
  } catch (e) {
    return e instanceof Error ? e.message : "שגיאה";
  }
  const withImage = imageUrl ? { ...data, imageUrl } : data;
  await db.brand.upsert({ where: { name: data.brand }, update: {}, create: { name: data.brand } });
  if (id === null) await db.product.create({ data: withImage });
  else await db.product.update({ where: { id }, data: withImage });
  revalidatePath("/admin/products");
  redirect("/admin/products");
}

const SETTING_KEYS = [
  "spillagePercent", "packagingCostPerUnit", "paymentFeePercent",
  "multiplier2ml", "multiplier5ml", "multiplier10ml",
  "freeShippingThreshold", "standardShippingCost", "lowStockThresholdMl", "outOfStockThresholdMl",
] as const;

export async function saveSettings(_: string | null, form: FormData) {
  await requireAdmin();
  const data: Record<string, number> = {};
  for (const k of SETTING_KEYS) {
    const v = Number(form.get(k));
    if (!Number.isFinite(v) || v < 0) return `ערך לא תקין: ${k}`;
    data[k] = v;
  }
  if (data.spillagePercent >= 100) return "אחוז פחת חייב להיות מתחת ל-100";
  if (data.outOfStockThresholdMl >= data.lowStockThresholdMl) return "סף \"אזל\" חייב להיות נמוך מסף \"עומד להיגמר\"";
  await db.settings.upsert({ where: { id: 1 }, update: data, create: { id: 1, ...data } });
  revalidatePath("/admin", "layout");
  return "נשמר";
}

export type AddBrandResult = { ok: true; name: string; brands: string[] } | { ok: false; error: string };

/** Adds a brand to the select list (or reuses an existing one, ignoring case). */
export async function addBrand(raw: string): Promise<AddBrandResult> {
  await requireAdmin();
  const name = raw.trim();
  if (!name) return { ok: false, error: "נא להזין שם חברה" };
  const all = await db.brand.findMany({ orderBy: { name: "asc" } });
  const existing = all.find((b) => b.name.toLowerCase() === name.toLowerCase());
  if (!existing) await db.brand.create({ data: { name } });
  const brands = (await db.brand.findMany({ orderBy: { name: "asc" } })).map((b) => b.name);
  return { ok: true, name: existing?.name ?? name, brands };
}

/** Deletes a product that has never been ordered. Ordered products must be deactivated instead. */
export async function deleteProduct(id: number): Promise<string | null> {
  await requireAdmin();
  const p = await db.product.findUnique({ where: { id } });
  if (!p) return "המוצר לא נמצא";
  if ((await db.orderItem.count({ where: { productId: id } })) > 0) {
    return "אי אפשר למחוק בושם שיש עליו הזמנות (ההיסטוריה תישבר). אפשר לסמן אותו כלא פעיל.";
  }
  await db.product.delete({ where: { id } });
  if (p.imageUrl && (await db.product.count({ where: { imageUrl: p.imageUrl } })) === 0) await removeImage(p.imageUrl);
  revalidatePath("/admin/products");
  redirect("/admin/products");
}

/** Deletes a brand (category) from the select list; only allowed when no product uses it. */
export async function deleteBrand(id: number): Promise<string | null> {
  await requireAdmin();
  const b = await db.brand.findUnique({ where: { id } });
  if (!b) return "החברה לא נמצאה";
  const inUse = await db.product.count({ where: { brand: b.name } });
  if (inUse > 0) return `אי אפשר למחוק: ${inUse} בשמים משויכים לחברה. יש להעביר אותם או למחוק אותם קודם.`;
  await db.brand.delete({ where: { id } });
  revalidatePath("/admin/brands");
  return null;
}

export type AddStockResult = { ok: true; message: string } | { ok: false; error: string };

/**
 * Adds newly bought ml to a product's stock, or removes ml to fix a mistake (direction "remove").
 * Both are atomic database updates, so they are safe next to order approvals.
 */
export async function adjustStock(productId: number, _: AddStockResult | null, form: FormData): Promise<AddStockResult> {
  await requireAdmin();
  const ml = Number(form.get("ml"));
  const remove = form.get("direction") === "remove";
  if (!Number.isFinite(ml) || ml <= 0 || ml > 100000) return { ok: false, error: "נא להזין כמות מ״ל חיובית" };
  const p = await db.product.findUnique({ where: { id: productId } });
  if (!p) return { ok: false, error: "המוצר לא נמצא" };

  const delta = (ml / p.bottleSizeMl) * 100;
  if (remove) {
    // Conditional update: succeeds only if enough stock remains at this exact moment.
    const done = await db.product.updateMany({
      where: { id: productId, currentFillPercent: { gte: delta - 1e-9 } },
      data: { currentFillPercent: { decrement: delta } },
    });
    if (done.count === 0) {
      const have = (p.bottleSizeMl * p.currentFillPercent) / 100;
      return { ok: false, error: `אי אפשר להוריד ${ml} מ״ל. במלאי יש רק ${have.toFixed(1)} מ״ל.` };
    }
  } else {
    await db.product.update({ where: { id: productId }, data: { currentFillPercent: { increment: delta } } });
  }
  const updated = await db.product.findUniqueOrThrow({ where: { id: productId } });
  revalidatePath("/admin", "layout");
  revalidatePath("/shop");
  const total = Math.max(0, (updated.bottleSizeMl * updated.currentFillPercent) / 100);
  return { ok: true, message: `${remove ? "הורדו" : "נוספו"} ${ml} מ״ל. סה״כ במלאי עכשיו: ${total.toFixed(1)} מ״ל.` };
}
