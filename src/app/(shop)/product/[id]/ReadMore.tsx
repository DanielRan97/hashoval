"use client";

import { useState } from "react";

/** A description that shows three lines and opens in full on request. Short ones are shown as they are. */
export function ReadMore({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const long = text.length > 160;
  return (
    <div className="readmore">
      <p className={long && !open ? "readmore-text clamped" : "readmore-text"}>{text}</p>
      {long && (
        <button type="button" className="link readmore-btn" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          {open ? "פחות" : "קרא עוד"}
        </button>
      )}
    </div>
  );
}
