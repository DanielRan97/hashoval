import { describe, expect, it } from "vitest";
import { vialDelta, vialLevel, vialShortage, vialsAvailable, vialsNeeded, type VialSettings } from "./vials";

const s = (over: Partial<VialSettings> = {}): VialSettings => ({ vials2ml: 20, vials5ml: null, vials10ml: 3, vialLowThreshold: 5, ...over });

describe("vials", () => {
  it("untracked sizes are never limited", () => {
    expect(vialsAvailable(s(), 5)).toBe(true);
    expect(vialLevel(s(), 5)).toBe("untracked");
  });
  it("a size with none left is unavailable and reported as out", () => {
    expect(vialsAvailable(s({ vials2ml: 0 }), 2)).toBe(false);
    expect(vialLevel(s({ vials2ml: 0 }), 2)).toBe("out");
  });
  it("low means at or under the threshold", () => {
    expect(vialLevel(s({ vials10ml: 5 }), 10)).toBe("low");
    expect(vialLevel(s({ vials10ml: 6 }), 10)).toBe("ok");
  });
  it("counts what an order needs and finds a shortage", () => {
    const needs = vialsNeeded([{ decantSizeMl: 10, quantity: 2 }, { decantSizeMl: 10, quantity: 2 }, { decantSizeMl: 5, quantity: 50 }]);
    expect(needs.get(10)).toBe(4);
    expect(vialShortage(s(), needs)).toBe(10); // 4 needed, 3 in stock; the untracked 5 ml is ignored
    expect(vialShortage(s({ vials10ml: 4 }), needs)).toBeNull();
  });
  it("takes and gives back only tracked sizes", () => {
    const needs = vialsNeeded([{ decantSizeMl: 2, quantity: 3 }, { decantSizeMl: 5, quantity: 2 }]);
    expect(vialDelta(s(), needs, -1)).toEqual({ vials2ml: { increment: -3 } });
    expect(vialDelta(s(), needs, 1)).toEqual({ vials2ml: { increment: 3 } });
  });
});
