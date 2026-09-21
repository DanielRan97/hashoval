import type { DecantSize } from "@/lib/pricing";

/**
 * Empty sample vials. Each decant size has its own count in the settings, and a size can only be sold
 * while it has vials. A count that was never entered (null in the database) means none.
 */
export const VIAL_SIZES = [2, 3, 5, 10] as const satisfies readonly DecantSize[];

export type VialSettings = {
  vials2ml: number | null;
  vials3ml: number | null;
  vials5ml: number | null;
  vials10ml: number | null;
  vialLowThreshold: number;
};

export type VialLevel = "ok" | "low" | "out";

export function vialStock(s: VialSettings, size: number): number {
  return (size === 2 ? s.vials2ml : size === 3 ? s.vials3ml : size === 5 ? s.vials5ml : size === 10 ? s.vials10ml : 0) ?? 0;
}

/** Can at least one more decant of this size be sold, as far as vials go? */
export function vialsAvailable(s: VialSettings, size: number): boolean {
  return vialStock(s, size) > 0;
}

export function vialLevel(s: VialSettings, size: number): VialLevel {
  const n = vialStock(s, size);
  if (n <= 0) return "out";
  return n <= s.vialLowThreshold ? "low" : "ok";
}

/** Vials an order needs, per size. */
export function vialsNeeded(items: { decantSizeMl: number; quantity: number }[]): Map<number, number> {
  const m = new Map<number, number>();
  for (const i of items) m.set(i.decantSizeMl, (m.get(i.decantSizeMl) ?? 0) + i.quantity);
  return m;
}

/** The first size that does not have enough vials for these needs, if any. */
export function vialShortage(s: VialSettings, needs: Map<number, number>): number | null {
  for (const [size, n] of needs) if (n > vialStock(s, size)) return size;
  return null;
}

/**
 * A settings update that takes (sign -1) or gives back (sign 1) the vials of an order. The counts must
 * be numbers in the database (see ensureVialCounts), because adding to a missing value stays missing.
 */
export function vialDelta(needs: Map<number, number>, sign: 1 | -1) {
  const d: { vials2ml?: { increment: number }; vials3ml?: { increment: number }; vials5ml?: { increment: number }; vials10ml?: { increment: number } } = {};
  const n2 = needs.get(2), n3 = needs.get(3), n5 = needs.get(5), n10 = needs.get(10);
  if (n2) d.vials2ml = { increment: sign * n2 };
  if (n3) d.vials3ml = { increment: sign * n3 };
  if (n5) d.vials5ml = { increment: sign * n5 };
  if (n10) d.vials10ml = { increment: sign * n10 };
  return d;
}

type SettingsWriter = {
  settings: { updateMany: (args: { where: Record<string, null>; data: Record<string, number> }) => PromiseLike<unknown> };
};

/** Turns counts that were never entered into 0, so they can be counted down and up. */
export async function ensureVialCounts(tx: SettingsWriter) {
  for (const f of ["vials2ml", "vials3ml", "vials5ml", "vials10ml"]) {
    await tx.settings.updateMany({ where: { [f]: null }, data: { [f]: 0 } });
  }
}
