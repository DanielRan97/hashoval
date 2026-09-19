export const MAX_IMAGES = 10;

const URL_RE = /^\/uploads\/[A-Za-z0-9-]{1,80}\.(jpg|png|webp)$/;

/** The product form sends its photos as a JSON list of URLs. Returns the list, or null if it is not valid. */
export function parseImageUrls(raw: string): string[] | null {
  let list: unknown;
  try {
    list = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!Array.isArray(list) || list.length > MAX_IMAGES) return null;
  if (!list.every((u) => typeof u === "string" && URL_RE.test(u))) return null;
  return [...new Set(list as string[])];
}
