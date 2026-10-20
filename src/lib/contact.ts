/**
 * Keeps letters, digits, spaces and hyphens. The payment provider rejects other special characters
 * in the values it is sent (quotes, slashes, symbols), so names and descriptions are cleaned first.
 */
export function cleanText(s: string, max = 100): string {
  return s.replace(/[^\p{L}\p{N}\s-]/gu, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

/** An Israeli mobile number as 05XXXXXXXXX, or null when it is not one. Accepts +972 and spaces or dashes. */
export function normalizeIsraeliMobile(raw: string): string | null {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("972")) digits = "0" + digits.slice(3);
  return /^05\d{8}$/.test(digits) ? digits : null;
}

/** At least two names (the payment page requires a first and a last name). */
export function isFullName(name: string): boolean {
  return cleanText(name, 80).split(" ").filter(Boolean).length >= 2;
}
