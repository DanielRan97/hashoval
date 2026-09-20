import { describe, expect, it } from "vitest";
import { clampFx, fxStyle, NO_FX } from "./photoFx";

describe("photoFx", () => {
  it("an untouched photo gets no style", () => {
    expect(fxStyle(NO_FX)).toBeUndefined();
    expect(fxStyle(undefined)).toBeUndefined();
  });
  it("a framed photo is shifted and scaled", () => {
    expect(fxStyle({ zoom: 1.5, x: 10, y: -5 })).toEqual({ transform: "translate(10%, -5%) scale(1.5)" });
  });
  it("keeps values inside the allowed range and repairs bad ones", () => {
    expect(clampFx({ zoom: 99, x: 500, y: -500 })).toEqual({ zoom: 3, x: 100, y: -100 });
    expect(clampFx({ zoom: 0, x: 0, y: 0 }).zoom).toBe(0.5);
    expect(clampFx({ zoom: NaN, x: NaN, y: NaN })).toEqual({ zoom: 1, x: 0, y: 0 });
  });
});
