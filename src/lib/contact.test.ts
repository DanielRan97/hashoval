import { describe, expect, it } from "vitest";
import { cleanText, isFullName, normalizeIsraeliMobile } from "./contact";

describe("contact helpers", () => {
  it("cleans special characters but keeps Hebrew, Latin, digits and hyphens", () => {
    expect(cleanText('דני "הקסם" כהן & בנו')).toBe("דני הקסם כהן בנו");
    expect(cleanText("Anne-Marie  O'Neil")).toBe("Anne-Marie O Neil");
  });
  it("accepts Israeli mobile numbers in common forms", () => {
    for (const n of ["0501234567", "050-123-4567", "+972 50 123 4567", "972501234567"]) expect(normalizeIsraeliMobile(n)).toBe("0501234567");
  });
  it("rejects landlines, short and foreign numbers", () => {
    for (const n of ["031234567", "050123456", "+12125551234", "", "abc"]) expect(normalizeIsraeliMobile(n)).toBeNull();
  });
  it("needs at least two names", () => {
    expect(isFullName("דני כהן")).toBe(true);
    expect(isFullName("Anne Marie O'Neil")).toBe(true);
    expect(isFullName("דני")).toBe(false);
    expect(isFullName("  ")).toBe(false);
  });
});
