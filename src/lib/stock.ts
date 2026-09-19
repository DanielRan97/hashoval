export type StockLevel = "out" | "low" | "ok";

export const STOCK_LABELS: Record<StockLevel, string> = {
  out: "המלאי אזל",
  low: "עומד להיגמר",
  ok: "קיים במלאי",
};

/** Classifies sellable (net) ml: below the out threshold is sold out, below the low threshold is running out. */
export function stockLevel(
  netMl: number,
  s: { outOfStockThresholdMl: number; lowStockThresholdMl: number },
): StockLevel {
  if (netMl < s.outOfStockThresholdMl) return "out";
  if (netMl < s.lowStockThresholdMl) return "low";
  return "ok";
}
