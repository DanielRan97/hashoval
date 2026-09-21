export const DECANT_SIZES = [2, 3, 5, 10] as const;
export type DecantSize = (typeof DECANT_SIZES)[number];

export type PricingSettings = {
  spillagePercent: number;
  packagingCostPerUnit: number;
  paymentFeePercent: number;
  multiplier2ml: number;
  multiplier3ml: number;
  multiplier5ml: number;
  multiplier10ml: number;
};

export type PricedProduct = {
  bottleSizeMl: number;
  currentFillPercent: number;
  marketValuePerBottle: number;
};

function multiplierFor(size: DecantSize, s: PricingSettings): number {
  return size === 2 ? s.multiplier2ml : size === 3 ? s.multiplier3ml : size === 5 ? s.multiplier5ml : s.multiplier10ml;
}

export type SamplePriceInput = {
  bottlePrice: number;
  bottleVolume: number;
  sampleSize: number;
  multiplier: number;
  wastagePercent: number;
  packagingCost: number;
  paymentFeePercent: number;
};

export type SamplePrice = {
  /** What one ml really costs once the wastage is counted: the bottle price over the ml that can be sold. */
  effectivePricePerMl: number;
  /** The cost of the liquid in the sample, before any mark-up. */
  liquidCost: number;
  /** The liquid after the size multiplier. The packaging is not multiplied. */
  liquidWithMultiplier: number;
  packagingCost: number;
  priceBeforeFees: number;
  /** What the payment provider keeps out of the final price. */
  paymentFee: number;
  /** Whole shekels, always rounded up. */
  finalPrice: number;
  pricePerMl: number;
};

const EPS = 1e-9; // so a float that is really 52 does not round up to 53

/**
 * The one place a decant's price is worked out.
 *
 *   effectivePricePerMl = bottlePrice / (bottleVolume × (1 − wastage%))
 *   priceBeforeFees     = effectivePricePerMl × sampleSize × multiplier + packagingCost
 *   finalPrice          = ceil(priceBeforeFees / (1 − paymentFee%))
 *
 * The multiplier applies to the liquid only, the packaging is a fixed cost, and the payment fee is
 * added last so that after the provider takes its share the planned price is what is left.
 * Shipping is deliberately not part of this: it is added separately at checkout.
 */
export function calculateSamplePrice(i: SamplePriceInput): SamplePrice {
  const usable = i.bottleVolume * (1 - i.wastagePercent / 100);
  const effectivePricePerMl = usable > 0 ? i.bottlePrice / usable : 0;
  const liquidCost = effectivePricePerMl * i.sampleSize;
  const liquidWithMultiplier = liquidCost * i.multiplier;
  const priceBeforeFees = liquidWithMultiplier + i.packagingCost;
  const feeRate = Math.min(Math.max(i.paymentFeePercent, 0), 99.9) / 100;
  const beforeRounding = priceBeforeFees / (1 - feeRate);
  const finalPrice = Math.ceil(beforeRounding - EPS);
  return {
    effectivePricePerMl,
    liquidCost,
    liquidWithMultiplier,
    packagingCost: i.packagingCost,
    priceBeforeFees,
    paymentFee: beforeRounding - priceBeforeFees,
    finalPrice,
    pricePerMl: i.sampleSize > 0 ? finalPrice / i.sampleSize : 0,
  };
}

/** The full breakdown for one decant of a product, from the shop settings. */
export function decantBreakdown(p: PricedProduct, size: DecantSize, s: PricingSettings): SamplePrice {
  return calculateSamplePrice({
    bottlePrice: p.marketValuePerBottle,
    bottleVolume: p.bottleSizeMl,
    sampleSize: size,
    multiplier: multiplierFor(size, s),
    wastagePercent: s.spillagePercent,
    packagingCost: s.packagingCostPerUnit,
    paymentFeePercent: s.paymentFeePercent,
  });
}

/** Price of one decant, in whole shekels. */
export function decantPrice(p: PricedProduct, size: DecantSize, s: PricingSettings): number {
  return decantBreakdown(p, size, s).finalPrice;
}

export function decantPrices(p: PricedProduct, s: PricingSettings): Record<DecantSize, number> {
  return { 2: decantPrice(p, 2, s), 3: decantPrice(p, 3, s), 5: decantPrice(p, 5, s), 10: decantPrice(p, 10, s) };
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
