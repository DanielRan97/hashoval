import { describe, expect, it } from "vitest";
import { SEARCH_LIMIT, searchProducts } from "./search";

const items = [
  { id: 1, brand: "Yves Saint Laurent", name: "Babycat" },
  { id: 2, brand: "Initio", name: "Musk Therapy" },
  { id: 3, brand: "Xerjoff", name: "Naxos" },
  { id: 4, brand: "Xerjoff", name: "Erba Pura" },
  { id: 5, brand: "Creed", name: "Aventus" },
];

describe("searchProducts", () => {
  it("finds by perfume name, with contains", () => {
    expect(searchProducts(items, "baby").map((p) => p.id)).toEqual([1]);
    expect(searchProducts(items, "therapy").map((p) => p.id)).toEqual([2]);
  });
  it("finds by brand", () => {
    expect(searchProducts(items, "xerjoff").map((p) => p.id).sort()).toEqual([3, 4]);
  });
  it("finds brand and name together", () => {
    expect(searchProducts(items, "laurent babycat").map((p) => p.id)).toEqual([1]);
  });
  it("ignores case and spaces at the ends", () => {
    expect(searchProducts(items, "  XERJOFF ").length).toBe(2);
    expect(searchProducts(items, "NaXoS").map((p) => p.id)).toEqual([3]);
  });
  it("puts results that start with the text first", () => {
    const r = searchProducts([{ id: 1, brand: "A", name: "Rose Musk" }, { id: 2, brand: "B", name: "Musk Rose" }], "musk");
    expect(r.map((p) => p.id)).toEqual([2, 1]);
  });
  it("returns nothing for an empty search or when nothing matches", () => {
    expect(searchProducts(items, "")).toEqual([]);
    expect(searchProducts(items, "   ")).toEqual([]);
    expect(searchProducts(items, "zzzz")).toEqual([]);
  });
  it("shows at most the limit", () => {
    const many = Array.from({ length: 30 }, (_, i) => ({ id: i, brand: "Brand", name: `Perfume ${i}` }));
    expect(searchProducts(many, "perfume")).toHaveLength(SEARCH_LIMIT);
  });
});
