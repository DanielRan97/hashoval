export const DECANT_SIZES = [2, 5, 10] as const;
export type DecantSize = (typeof DECANT_SIZES)[number];

export type PricingSettings = {
  spillagePercent: number;
  multiplier2ml: number;
  multiplier5ml: number;
  multiplier10ml: number;
};

export type PricedProduct = {
  bottleSizeMl: number;
  currentFillPercent: number;
  marketValuePerBottle: number;
};

function multiplierFor(size: DecantSize, s: PricingSettings): number {
  return size === 2 ? s.multiplier2ml : size === 5 ? s.multiplier5ml : s.multiplier10ml;
}

/** Price of one decant, rounded to the nearest whole shekel. */
export function decantPrice(p: PricedProduct, size: DecantSize, s: PricingSettings): number {
  const perMl = p.marketValuePerBottle / p.bottleSizeMl;
  return Math.round(perMl * size * multiplierFor(size, s));
}

export function decantPrices(p: PricedProduct, s: PricingSettings): Record<DecantSize, number> {
  return { 2: decantPrice(p, 2, s), 5: decantPrice(p, 5, s), 10: decantPrice(p, 10, s) };
}

/** Raw ml left in the bottle. */
export function availableMl(p: PricedProduct): number {
  return (p.bottleSizeMl * p.currentFillPercent) / 100;
}

/** ml that can actually be sold after spillage. All stock checks use this. */
export function sellableMl(p: PricedProduct, s: PricingSettings): number {
  return availableMl(p) * (1 - s.spillagePercent / 100);
}

/** Can `ml` be fulfilled from this bottle? */
export function hasStockFor(p: PricedProduct, s: PricingSettings, ml: number): boolean {
  return sellableMl(p, s) + 1e-9 >= ml;
}

/**
 * Fill percent after selling `ml` from the bottle. Spillage is lost on top of the
 * sold amount, so the raw bottle drops by ml / (1 - spillage).
 */
export function fillPercentAfterSale(p: PricedProduct, s: PricingSettings, ml: number): number {
  const rawUsed = ml / (1 - s.spillagePercent / 100);
  const remaining = Math.max(0, availableMl(p) - rawUsed);
  return (remaining / p.bottleSizeMl) * 100;
}

/** Shipping is waived at/above the threshold. */
export function shippingFor(subtotal: number, threshold: number, standard: number): number {
  return subtotal >= threshold ? 0 : standard;
}

/**
 * Inverse of fillPercentAfterSale: puts sold ml (plus its spillage) back.
 * Not capped at 100%: fill percent is relative to one bottle, so several bottles are >100%.
 */
export function fillPercentAfterRestock(p: PricedProduct, s: PricingSettings, ml: number): number {
  const rawBack = ml / (1 - s.spillagePercent / 100);
  return ((availableMl(p) + rawBack) / p.bottleSizeMl) * 100;
}

/** Fill percent (relative to one bottle) after adding `ml` of newly bought stock. */
export function fillPercentAfterAdding(p: PricedProduct, ml: number): number {
  return p.currentFillPercent + (ml / p.bottleSizeMl) * 100;
}
