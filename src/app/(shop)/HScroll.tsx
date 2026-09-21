"use client";

import { useRef } from "react";

/**
 * A row that scrolls sideways: swipe on a touch screen, or use the two arrows with a mouse.
 * The cards snap into place. The arrows move it by roughly one screenful.
 */
export function HScroll({ children, label }: { children: React.ReactNode; label: string }) {
  const row = useRef<HTMLDivElement>(null);
  const go = (dir: 1 | -1) => {
    const el = row.current;
    if (!el) return;
    // in a right-to-left page "next" is towards the left, which is a negative scroll offset
    const rtl = getComputedStyle(el).direction === "rtl";
    el.scrollBy({ left: dir * (rtl ? -1 : 1) * el.clientWidth * 0.85, behavior: "smooth" });
  };
  return (
    <div className="hscroll">
      <div className="hscroll-row" ref={row} role="group" aria-label={label}>
        {children}
      </div>
      <button type="button" className="hscroll-arrow prev" onClick={() => go(-1)} aria-label="הקודם">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
      </button>
      <button type="button" className="hscroll-arrow next" onClick={() => go(1)} aria-label="הבא">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
      </button>
    </div>
  );
}
