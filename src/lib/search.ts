export type SearchItem = { id: number; brand: string; name: string };

/** How many results the drop-down shows at most. */
export const SEARCH_LIMIT = 8;

/**
 * Finds products already in the shop by brand or perfume name: case-insensitive, spaces at the ends
 * ignored, and "contains" (so "baby" finds "Babycat"). Results whose brand or name starts with the
 * text come first. It only ever looks at the products it is given; it knows nothing else.
 */
export function searchProducts<T extends SearchItem>(items: T[], query: string, limit = SEARCH_LIMIT): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const hits = items.filter((p) => {
    const brand = p.brand.toLowerCase();
    const name = p.name.toLowerCase();
    return brand.includes(q) || name.includes(q) || `${brand} ${name}`.includes(q);
  });
  const starts = (p: SearchItem) => (p.name.toLowerCase().startsWith(q) || p.brand.toLowerCase().startsWith(q) ? 0 : 1);
  return hits.sort((a, b) => starts(a) - starts(b) || a.brand.localeCompare(b.brand) || a.name.localeCompare(b.name)).slice(0, limit);
}
