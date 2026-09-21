import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";
import { WISHLIST_MAX_LENGTH, checkFragranceName } from "./wishlist";
import { buildWishlistWorkbook, wishlistDate, wishlistSheetRows } from "./wishlistExport";

describe("checkFragranceName", () => {
  it("accepts a normal request and keeps the text as written", () => {
    expect(checkFragranceName("YSL Babycat")).toEqual({ ok: true, value: "YSL Babycat" });
    expect(checkFragranceName("baby cat")).toEqual({ ok: true, value: "baby cat" });
  });
  it("trims the spaces at the ends but changes nothing else", () => {
    expect(checkFragranceName("   Babycat  ")).toEqual({ ok: true, value: "Babycat" });
    expect(checkFragranceName("Maison  Francis   Kurkdjian")).toEqual({ ok: true, value: "Maison  Francis   Kurkdjian" });
  });
  it("rejects empty and blank requests", () => {
    for (const v of ["", "   ", "\t\n", null, undefined, 5]) expect(checkFragranceName(v).ok).toBe(false);
  });
  it("allows exactly the maximum and rejects one more", () => {
    expect(checkFragranceName("a".repeat(WISHLIST_MAX_LENGTH)).ok).toBe(true);
    expect(checkFragranceName("a".repeat(WISHLIST_MAX_LENGTH + 1)).ok).toBe(false);
    expect(checkFragranceName(" " + "a".repeat(WISHLIST_MAX_LENGTH) + " ").ok).toBe(true); // the spaces do not count
  });
  it("does not treat similar names as one", () => {
    const names = ["Babycat", "YSL Babycat", "baby cat"].map((n) => (checkFragranceName(n) as { value: string }).value);
    expect(new Set(names).size).toBe(3);
  });
});

describe("wishlist export", () => {
  const requests = [
    { fragranceName: "  keep as is?  ", createdAt: new Date("2026-09-21T11:30:00Z") },
    { fragranceName: "=SUM(1+1)", createdAt: new Date("2026-09-20T08:05:00Z") },
    { fragranceName: "YSL Babycat", createdAt: new Date("2026-09-20T08:05:00Z") },
    { fragranceName: "YSL Babycat", createdAt: new Date("2026-09-19T21:59:00Z") },
  ];
  it("writes the date in Israel time", () => {
    expect(wishlistDate(new Date("2026-09-21T11:30:00Z"))).toBe("2026-09-21 14:30");
    expect(wishlistDate(new Date("2026-09-19T21:59:00Z"))).toBe("2026-09-20 00:59");
  });
  it("has the two columns, one row per request, in the order given, without grouping", () => {
    const rows = wishlistSheetRows(requests);
    expect(rows[0]).toEqual(["Date", "Fragrance Name"]);
    expect(rows).toHaveLength(5);
    expect(rows.slice(1).map((r) => r[1])).toEqual(["  keep as is?  ", "=SUM(1+1)", "YSL Babycat", "YSL Babycat"]); // duplicates stay
  });
  it("produces a real .xlsx that reads back with the exact text, and a formula stays text", () => {
    const buf = buildWishlistWorkbook(requests);
    expect(buf.subarray(0, 2).toString()).toBe("PK"); // an .xlsx is a zip file
    const sheet = XLSX.read(buf, { type: "buffer" });
    const back = XLSX.utils.sheet_to_json<string[]>(sheet.Sheets[sheet.SheetNames[0]], { header: 1, raw: true });
    expect(back[0]).toEqual(["Date", "Fragrance Name"]);
    expect(back[2][1]).toBe("=SUM(1+1)");
    expect(sheet.Sheets[sheet.SheetNames[0]].B3.f).toBeUndefined();
    expect(back).toHaveLength(5);
  });
  it("an empty list is just the header", () => {
    const sheet = XLSX.read(buildWishlistWorkbook([]), { type: "buffer" });
    expect(XLSX.utils.sheet_to_json(sheet.Sheets[sheet.SheetNames[0]], { header: 1 })).toEqual([["Date", "Fragrance Name"]]);
  });
});
