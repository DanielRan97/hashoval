"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { IconSearch } from "./NavIcons";
import { ShopSearch, type SearchEntry } from "./shop/ShopSearch";

/**
 * The magnifying glass in the header. It opens a small search window just under the header. The list
 * of perfumes is fetched once, the first time the window opens, so pages that never use it pay nothing.
 * It finds perfumes that are already in the shop and does nothing else.
 */
export function NavSearch() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<SearchEntry[] | null>(null);
  const [failed, setFailed] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // a new page closes the window (adjusted while rendering, when the address changes)
  const [seenPath, setSeenPath] = useState(pathname);
  if (pathname !== seenPath) {
    setSeenPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open || items) return;
    let stopped = false;
    fetch("/api/search-items")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: SearchEntry[]) => !stopped && setItems(data))
      .catch(() => !stopped && setFailed(true));
    return () => {
      stopped = true;
    };
  }, [open, items]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="nav-search" ref={root}>
      <button
        type="button"
        className="nav-icon"
        data-label="חיפוש"
        aria-label="חיפוש"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((v) => !v)}
      >
        <IconSearch />
      </button>
      {open && (
        <div className="nav-search-panel" role="dialog" aria-label="חיפוש בושם">
          {failed ? (
            <p className="nav-search-msg">החיפוש לא זמין כרגע. נסו שוב בעוד רגע.</p>
          ) : items ? (
            <ShopSearch items={items} inline autoFocus onDone={() => setOpen(false)} />
          ) : (
            <p className="nav-search-msg">טוען…</p>
          )}
        </div>
      )}
    </div>
  );
}
