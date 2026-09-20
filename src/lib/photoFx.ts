import type { CSSProperties } from "react";

/** How a photo is framed in its square: zoom (1 = as uploaded) and a shift as a percentage of the frame. */
export type PhotoFx = { zoom: number; x: number; y: number };
export type PhotoData = { url: string } & PhotoFx;

export const NO_FX: PhotoFx = { zoom: 1, x: 0, y: 0 };
export const ZOOM_MIN = 0.5;
export const ZOOM_MAX = 3;
export const SHIFT_MAX = 100;

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** Keeps a framing inside the allowed range; anything that is not a number falls back to "as uploaded". */
export function clampFx(fx: PhotoFx): PhotoFx {
  const ok = (n: number, fallback: number) => (Number.isFinite(n) ? n : fallback);
  return {
    zoom: clamp(ok(fx.zoom, 1), ZOOM_MIN, ZOOM_MAX),
    x: clamp(ok(fx.x, 0), -SHIFT_MAX, SHIFT_MAX),
    y: clamp(ok(fx.y, 0), -SHIFT_MAX, SHIFT_MAX),
  };
}

export function isNeutral(fx?: PhotoFx) {
  return !fx || (fx.zoom === 1 && fx.x === 0 && fx.y === 0);
}

/** The inline style that shows a photo the way it was framed. Nothing for an untouched photo. */
export function fxStyle(fx?: PhotoFx): CSSProperties | undefined {
  if (isNeutral(fx)) return undefined;
  const { zoom, x, y } = fx!;
  return { transform: `translate(${x}%, ${y}%) scale(${zoom})` };
}
