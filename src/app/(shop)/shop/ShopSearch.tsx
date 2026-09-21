"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { searchProducts } from "@/lib/search";

export type SearchEntry = { id: number; brand: string; name: string; image: string | null; price: string };

/**
 * Search box for the shop: finds perfumes that are already in the catalogue, by brand or name, and
 * suggests them as you type. Choosing one opens its page. The list is filtered right here in the
 * browser (the shop shows the whole catalogue anyway), so there are no requests while typing.
 * When nothing matches it says so and nothing else.
 */
export function ShopSearch({
  items,
  inline = false,
  autoFocus = false,
  onDone,
}: {
  items: SearchEntry[];
  /** The results list sits in the flow under the box (inside the header's search window) instead of floating over the page. */
  inline?: boolean;
  autoFocus?: boolean;
  /** Called after a result is chosen, so a surrounding window can close. */
  onDone?: () => void;
}) {
  const router = useRouter();
  const listId = useId();
  const root = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const results = useMemo(() => searchProducts(items, query), [items, query]);
  const showing = open && query.trim().length > 0;

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const close = () => {
    setOpen(false);
    setActive(-1);
    onDone?.();
  };

  return (
    <div className={inline ? "shop-search inline" : "shop-search"} ref={root}>
      <input
        type="search"
        role="combobox"
        aria-expanded={showing}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        aria-label="חיפוש בושם או מותג"
        placeholder="חיפוש בושם או מותג"
        autoComplete="off"
        enterKeyHint="search"
        autoFocus={autoFocus}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            close();
          } else if (e.key === "ArrowDown" && results.length > 0) {
            e.preventDefault();
            setOpen(true);
            setActive((i) => (i + 1) % results.length);
          } else if (e.key === "ArrowUp" && results.length > 0) {
            e.preventDefault();
            setActive((i) => (i <= 0 ? results.length - 1 : i - 1));
          } else if (e.key === "Enter") {
            e.preventDefault();
            const pick = results[active];
            if (pick) {
              close();
              router.push(`/product/${pick.id}`);
            }
          }
        }}
      />
      {showing && (
        <ul className="shop-search-list" id={listId} role="listbox" aria-label="תוצאות חיפוש">
          {results.length === 0 ? (
            <li className="shop-search-empty" role="presentation">לא נמצאו תוצאות</li>
          ) : (
            results.map((r, i) => (
              <li key={r.id} id={`${listId}-${i}`} role="option" aria-selected={i === active}>
                <Link href={`/product/${r.id}`} className={i === active ? "active" : undefined} onClick={close} tabIndex={-1}>
                  <span className="shop-search-thumb">{r.image && <img src={r.image} alt="" draggable={false} />}</span>
                  <span className="shop-search-text">
                    <span className="shop-search-brand">{r.brand}</span>
                    <span className="shop-search-name">{r.name}</span>
                  </span>
                  {r.price && <span className="shop-search-price">{r.price}</span>}
                </Link>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
