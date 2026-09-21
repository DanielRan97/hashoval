import * as XLSX from "xlsx";

export type WishlistRow = { fragranceName: string; createdAt: Date };

/** "2026-09-21 14:30" in Israel time, whatever time zone the server runs in. */
export function wishlistDate(d: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jerusalem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}`;
}

/** Header row, then one row per request, in the order given. The name is exactly what the visitor wrote. */
export function wishlistSheetRows(requests: WishlistRow[]): string[][] {
  return [["Date", "Fragrance Name"], ...requests.map((r) => [wishlistDate(r.createdAt), r.fragranceName])];
}

/** A real .xlsx file. Every cell is written as text, so a name such as "=1+1" is never run as a formula. */
export function buildWishlistWorkbook(requests: WishlistRow[]): Buffer {
  const rows = wishlistSheetRows(requests);
  const sheet: XLSX.WorkSheet = {};
  rows.forEach((row, r) => row.forEach((value, c) => (sheet[XLSX.utils.encode_cell({ r, c })] = { t: "s", v: value })));
  sheet["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rows.length - 1, c: 1 } });
  sheet["!cols"] = [{ wch: 18 }, { wch: 50 }];
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Wishlist");
  return XLSX.write(book, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
