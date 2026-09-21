"use server";

import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import { clientIp, consume, minutes } from "@/lib/rateLimit";
import { checkFragranceName } from "@/lib/wishlist";

export type WishlistState = { ok: boolean; message?: string } | null;

/**
 * Saves one wish, exactly as typed (trimmed). Open to guests. The visitor is not identified: the only
 * thing kept about the request is the text and the time. For the rate limit the address is scrambled
 * with a one-way hash, so no address is stored anywhere.
 */
export async function submitWishlist(_: WishlistState, form: FormData): Promise<WishlistState> {
  // a field real visitors never see; bots fill it in
  if (String(form.get("hp_check_9k2") ?? "").trim() !== "") return { ok: false, message: "לא ניתן לשלוח את הבקשה" };

  const check = checkFragranceName(form.get("fragranceName"));
  if (!check.ok) return { ok: false, message: check.error };

  const who = createHash("sha256").update(`${await clientIp()}|${process.env.SESSION_SECRET ?? ""}`).digest("hex").slice(0, 24);
  const limit = await consume(`wish:${who}`, 5, 10 * 60_000);
  if (!limit.ok) return { ok: false, message: `שלחתם הרבה בקשות בזמן קצר. נסו שוב בעוד ${minutes(limit.retryAfter)} דקות.` };

  await db.wishlistRequest.create({ data: { fragranceName: check.value } });
  return { ok: true };
}
