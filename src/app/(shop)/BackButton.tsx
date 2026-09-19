"use client";

import { useRouter } from "next/navigation";

/** Goes back to the previous page, or to the shop if this page was opened directly. */
export function BackButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      className="back-btn"
      onClick={() => {
        // With earlier history, go back exactly like the browser's own button (the shop keeps its filters).
        // Opened directly in a fresh tab there is nothing to go back to, so go to the shop.
        if (window.history.length > 1) router.back();
        else router.push("/shop");
      }}
    >
      {/* the site reads right to left, so "back" points to the right */}
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
      חזרה
    </button>
  );
}
