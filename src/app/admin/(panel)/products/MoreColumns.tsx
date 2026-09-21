"use client";

import { useState } from "react";

/** Wraps a table whose less-used columns (marked `extra`) are hidden until "more data" is pressed. */
export function MoreColumns({ children }: { children: React.ReactNode }) {
  const [more, setMore] = useState(false);
  return (
    <div className={more ? "cols cols-more" : "cols"}>
      <p className="cols-toggle">
        <button type="button" className="btn ghost sm" aria-pressed={more} onClick={() => setMore((v) => !v)}>
          {more ? "פחות נתונים" : "עוד נתונים"}
        </button>
      </p>
      {children}
    </div>
  );
}
