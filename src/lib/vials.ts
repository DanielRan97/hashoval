import type { DecantSize } from "@/lib/pricing";

/**
 * Empty sample vials. Each decant size has its own count in the settings. A count of null means the
 * owner does not track that size, so it is never limited by vials; a number limits how many can be sold.
 */
export const VIAL_SIZES = [2, 5, 10] as const satisfies readonly DecantSize[];

export type VialSettings = {
  vials2ml: number | null;
  vials5ml: number | null;
  vials10ml: number | null;
  vialLowThreshold: number;
};

export type VialLevel = "untracked" | "ok" | "low" | "out";

export function vialStock(s: VialSettings, size: number): number | null {
  return size === 2 ? s.vials2ml : size === 5 ? s.vials5ml : size === 10 ? s.vials10ml : null;
}

/** Can at least one more decant of this size be sold, as far as vials go? */
export function vialsAvailable(s: VialSettings, size: number): boolean {
  const n = vialStock(s, size);
  return n === null || n > 0;
}

export function vialLevel(s: VialSettings, size: number): VialLevel {
  const n = vialStock(s, size);
  if (n === null) return "untracked";
  if (n <= 0) return "out";
  return n <= s.vialLowThreshold ? "low" : "ok";
}

/** Vials an order needs, per size. */
export function vialsNeeded(items: { decantSizeMl: number; quantity: number }[]): Map<number, number> {
  const m = new Map<number, number>();
  for (const i of items) m.set(i.decantSizeMl, (m.get(i.decantSizeMl) ?? 0) + i.quantity);
  return m;
}

/** The first tracked size that does not have enough vials for these needs, if any. */
export function vialShortage(s: VialSettings, needs: Map<number, number>): number | null {
  for (const [size, n] of needs) {
    const have = vialStock(s, size);
    if (have !== null && n > have) return size;
  }
  return null;
}

/** A settings update that takes (sign -1) or gives back (sign 1) the vials of an order. Untracked sizes are left alone. */
export function vialDelta(s: VialSettings, needs: Map<number, number>, sign: 1 | -1) {
  const d: { vials2ml?: { increment: number }; vials5ml?: { increment: number }; vials10ml?: { increment: number } } = {};
  const n2 = needs.get(2), n5 = needs.get(5), n10 = needs.get(10);
  if (s.vials2ml !== null && n2) d.vials2ml = { increment: sign * n2 };
  if (s.vials5ml !== null && n5) d.vials5ml = { increment: sign * n5 };
  if (s.vials10ml !== null && n10) d.vials10ml = { increment: sign * n10 };
  return d;
}
