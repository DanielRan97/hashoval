import { describe, expect, it } from "vitest";
import { calculateSamplePrice, decantPrices, sellableMl, hasStockFor, fillPercentAfterSale, shippingFor } from "./pricing";

const s = { spillagePercent: 5, packagingCostPerUnit: 3, paymentFeePercent: 2.5, multiplier2ml: 1.75, multiplier3ml: 1.6, multiplier5ml: 1.45, multiplier10ml: 1.25 };
// 1000 ₪ / 100 ml = 10 ₪ per ml
const p = { bottleSizeMl: 100, currentFillPercent: 100, marketValuePerBottle: 1000 };

describe("pricing", () => {
  it("prices decants with wastage, packaging and the payment fee", () => {
    // 1000 for 100 ml, 5% wastage: 10.526/ml. 2 ml: 21.05*1.75 + 3 = 39.84, /0.975 = 40.86 -> 41
    expect(decantPrices(p, s)).toEqual({ 2: 41, 3: 55, 5: 82, 10: 139 });
  });
  it("uses odd bottle sizes", () => {
    const q = { bottleSizeMl: 75, currentFillPercent: 100, marketValuePerBottle: 1500 };
    expect(decantPrices(q, s)[2]).toBe(79);
  });
});

describe("calculateSamplePrice", () => {
  const aventus = { bottlePrice: 1100, bottleVolume: 100, sampleSize: 2, multiplier: 1.75, wastagePercent: 5, packagingCost: 3, paymentFeePercent: 2.5 };
  it("works the Creed Aventus example step by step", () => {
    const r = calculateSamplePrice(aventus);
    expect(r.effectivePricePerMl).toBeCloseTo(11.5789, 4);
    expect(r.liquidCost).toBeCloseTo(23.1579, 4);
    expect(r.liquidWithMultiplier).toBeCloseTo(40.5263, 4);
    expect(r.priceBeforeFees).toBeCloseTo(43.5263, 4);
    expect(r.paymentFee).toBeCloseTo(1.1160, 3);
    expect(r.finalPrice).toBe(45);
    expect(r.pricePerMl).toBeCloseTo(22.5, 5);
  });
  it("multiplies the liquid only, not the packaging", () => {
    const zero = calculateSamplePrice({ ...aventus, wastagePercent: 0, paymentFeePercent: 0, packagingCost: 0, multiplier: 2 });
    const withPack = calculateSamplePrice({ ...aventus, wastagePercent: 0, paymentFeePercent: 0, packagingCost: 3, multiplier: 2 });
    expect(withPack.priceBeforeFees - zero.priceBeforeFees).toBeCloseTo(3, 9);
  });
  it("leaves the planned price after the provider's cut", () => {
    const r = calculateSamplePrice(aventus);
    expect(r.finalPrice * (1 - 0.025)).toBeGreaterThanOrEqual(r.priceBeforeFees);
  });
  it("always rounds up to a whole shekel, but an exact price stays as it is", () => {
    const base = { bottleVolume: 100, sampleSize: 2, multiplier: 1, wastagePercent: 0, packagingCost: 0, paymentFeePercent: 0 };
    expect(calculateSamplePrice({ ...base, bottlePrice: 2400 }).finalPrice).toBe(48); // exactly 48
    expect(calculateSamplePrice({ ...base, bottlePrice: 2406 }).finalPrice).toBe(49); // 48.12
    expect(calculateSamplePrice({ ...base, bottlePrice: 2600.5 }).finalPrice).toBe(53); // 52.01
  });
  it("does not blow up on nonsense", () => {
    expect(calculateSamplePrice({ ...aventus, bottleVolume: 0 }).finalPrice).toBe(Math.ceil(3 / 0.975));
    expect(Number.isFinite(calculateSamplePrice({ ...aventus, paymentFeePercent: 100 }).finalPrice)).toBe(true);
  });
});

describe("stock", () => {
  it("sellable ml applies fill and spillage", () => {
    expect(sellableMl({ ...p, currentFillPercent: 50 }, s)).toBeCloseTo(47.5);
  });
  it("rejects orders over sellable ml, accepts exact", () => {
    const half = { ...p, currentFillPercent: 10 }; // 10ml raw, 9.5 sellable
    expect(hasStockFor(half, s, 10)).toBe(false);
    expect(hasStockFor(half, s, 9.5)).toBe(true);
  });
  it("selling everything sellable empties the bottle", () => {
    expect(fillPercentAfterSale(p, s, 95)).toBeCloseTo(0);
  });
  it("partial sale reduces fill including spillage", () => {
    // 10ml sold -> 10.526 raw used -> 89.47%
    expect(fillPercentAfterSale(p, s, 10)).toBeCloseTo(89.4737, 3);
  });
});

describe("shipping", () => {
  it("free at and above threshold", () => {
    expect(shippingFor(399, 400, 30)).toBe(30);
    expect(shippingFor(400, 400, 30)).toBe(0);
  });
});

import { fillPercentAfterRestock } from "./pricing";
describe("restock", () => {
  it("is the inverse of a sale", () => {
    const after = fillPercentAfterSale(p, s, 10);
    expect(fillPercentAfterRestock({ ...p, currentFillPercent: after }, s, 10)).toBeCloseTo(100);
  });
  it("can exceed 100% when several bottles are in stock", () => {
    expect(fillPercentAfterRestock(p, s, 47.5)).toBeCloseTo(150);
  });
});

import { stockLevel } from "./stock";
describe("stockLevel", () => {
  const t = { outOfStockThresholdMl: 5, lowStockThresholdMl: 20 };
  it("classifies by net ml", () => {
    expect(stockLevel(4.9, t)).toBe("out");
    expect(stockLevel(5, t)).toBe("low");
    expect(stockLevel(19.9, t)).toBe("low");
    expect(stockLevel(20, t)).toBe("ok");
  });
});

import { fillPercentAfterAdding } from "./pricing";
describe("adding stock", () => {
  it("adds ml relative to bottle size, beyond 100%", () => {
    const empty = { ...p, currentFillPercent: 3 }; // 3ml left
    expect(fillPercentAfterAdding(empty, 300)).toBeCloseTo(303);
    // 303% of a 100ml bottle = 303ml raw
    expect(sellableMl({ ...p, currentFillPercent: 303 }, s)).toBeCloseTo(287.85);
  });
});

import { configProblems } from "./configCheck";
describe("configProblems", () => {
  it("flags default or short secrets", () => {
    expect(configProblems({ ADMIN_PASSWORD: "change-me", SESSION_SECRET: "change-me-to-a-long-random-string" })).toHaveLength(2);
    expect(configProblems({ ADMIN_PASSWORD: "short", SESSION_SECRET: "x".repeat(40) })).toHaveLength(1);
  });
  it("accepts strong values", () => {
    expect(configProblems({ ADMIN_PASSWORD: "a-long-unique-password-1", SESSION_SECRET: "s".repeat(48) })).toEqual([]);
  });
});

import { parseImageUrls } from "./imageUrls";
describe("parseImageUrls", () => {
  it("accepts our own upload urls, keeps order, drops duplicates", () => {
    expect(parseImageUrls('["/uploads/a1-b2.png","/uploads/c3.webp","/uploads/a1-b2.png"]')).toEqual(["/uploads/a1-b2.png", "/uploads/c3.webp"]);
  });
  it("rejects anything else", () => {
    expect(parseImageUrls("not json")).toBeNull();
    expect(parseImageUrls('["https://evil.example/x.png"]')).toBeNull();
    expect(parseImageUrls('["/uploads/../secret.png"]')).toBeNull();
    expect(parseImageUrls(JSON.stringify(Array.from({ length: 11 }, (_, i) => `/uploads/i${i}.png`)))).toBeNull();
  });
});

import { isGender } from "./gender";
describe("isGender", () => {
  it("accepts only the three audiences", () => {
    expect(["women", "men", "unisex"].every(isGender)).toBe(true);
    expect(isGender("kids")).toBe(false);
    expect(isGender(undefined)).toBe(false);
  });
});

import { sortProducts, isSortKey } from "./sort";
describe("sortProducts", () => {
  const mk = (name: string, fromPrice: number, day: number, sold: number, views: number) => ({ brand: "B", name, fromPrice, createdAt: new Date(2026, 0, day), sold, views });
  const list = [mk("a", 50, 3, 1, 90), mk("b", 30, 1, 9, 10), mk("c", 70, 2, 5, 50)];
  const names = (k: Parameters<typeof sortProducts>[1]) => sortProducts(list, k).map((p) => p.name).join("");
  it("orders by price, date, sales and views", () => {
    expect(names("price_desc")).toBe("cab");
    expect(names("price_asc")).toBe("bac");
    expect(names("newest")).toBe("acb");
    expect(names("oldest")).toBe("bca");
    expect(names("bestsellers")).toBe("bca");
    expect(names("popular")).toBe("acb");
  });
  it("ties are broken by name", () => {
    expect(sortProducts([mk("z", 5, 1, 0, 0), mk("y", 5, 1, 0, 0)], "price_asc").map((p) => p.name).join("")).toBe("yz");
  });
  it("validates keys", () => {
    expect(isSortKey("newest")).toBe(true);
    expect(isSortKey("cheapest")).toBe(false);
  });
});
