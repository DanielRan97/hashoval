/** The longest perfume name a visitor may send. */
export const WISHLIST_MAX_LENGTH = 150;

export type WishlistCheck = { ok: true; value: string } | { ok: false; error: string };

/**
 * Checks what a visitor typed. The text is kept exactly as written: only the spaces at the start and
 * the end are removed. It is not cleaned up, matched with the catalogue or grouped in any way.
 */
export function checkFragranceName(raw: unknown): WishlistCheck {
  if (typeof raw !== "string") return { ok: false, error: "נא לכתוב את שם הבושם" };
  const value = raw.trim();
  if (value.length === 0) return { ok: false, error: "נא לכתוב את שם הבושם" };
  if (value.length > WISHLIST_MAX_LENGTH) return { ok: false, error: `אפשר עד ${WISHLIST_MAX_LENGTH} תווים` };
  return { ok: true, value };
}
