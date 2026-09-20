"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

/** TEMPORARY: wipes test orders before launch. Remove this folder once the live shop is clean. */
export async function deleteAllOrders(_: string | null, form: FormData): Promise<string | null> {
  await requireAdmin();
  if (String(form.get("confirm") ?? "").trim() !== "מחק") return "יש להקליד את המילה מחק כדי לאשר";
  const items = await db.orderItem.deleteMany();
  const orders = await db.order.deleteMany();
  revalidatePath("/admin", "layout");
  revalidatePath("/shop");
  return `נמחקו ${orders.count} הזמנות (${items.count} פריטים). עכשיו אפשר למחוק את המוצרים בעמוד המוצרים.`;
}
