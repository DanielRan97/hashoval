export const SORT_KEYS = ["price_desc", "price_asc", "newest", "oldest", "bestsellers", "popular"] as const;
export type SortKey = (typeof SORT_KEYS)[number];

export const SORT_LABELS: Record<SortKey, string> = {
  price_desc: "מהיקר לזול",
  price_asc: "מהזול ליקר",
  newest: "מהחדש לישן",
  oldest: "מהישן לחדש",
  bestsellers: "הנמכרים ביותר",
  popular: "הפופולריים ביותר",
};

export function isSortKey(v: unknown): v is SortKey {
  return typeof v === "string" && (SORT_KEYS as readonly string[]).includes(v);
}

type Sortable = { brand: string; name: string; fromPrice: number; createdAt: Date; sold: number; views: number };

/**
 * Sorts products. Ties fall back to brand and name so the order is stable.
 * bestsellers = most units bought (paid, not refunded); popular = most page views.
 */
export function sortProducts<T extends Sortable>(list: T[], key: SortKey): T[] {
  const by: Record<SortKey, (a: T, b: T) => number> = {
    price_desc: (a, b) => b.fromPrice - a.fromPrice,
    price_asc: (a, b) => a.fromPrice - b.fromPrice,
    newest: (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    oldest: (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    bestsellers: (a, b) => b.sold - a.sold,
    popular: (a, b) => b.views - a.views,
  };
  return [...list].sort((a, b) => by[key](a, b) || a.brand.localeCompare(b.brand) || a.name.localeCompare(b.name));
}
