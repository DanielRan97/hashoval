"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Option = { key: string; label: string; href: string };

/**
 * A glass dropdown. Each option is a plain link, so it works without scripting and the
 * page state stays in the address. Closes on outside click and Escape; arrow keys move between options.
 */
export function GlassSelect({ options, currentKey, placeholder }: { options: Option[]; currentKey?: string; placeholder: string }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const current = options.find((o) => o.key === currentKey);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function move(e: React.KeyboardEvent, step: 1 | -1) {
    e.preventDefault();
    const links = [...(root.current?.querySelectorAll<HTMLAnchorElement>(".glass-select-list a") ?? [])];
    const at = links.indexOf(document.activeElement as HTMLAnchorElement);
    links[(at + step + links.length) % links.length]?.focus();
  }

  return (
    <div className="glass-select" ref={root}>
      <button
        ref={button}
        type="button"
        className="glass-select-btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            setOpen(true);
            requestAnimationFrame(() => root.current?.querySelector<HTMLAnchorElement>(".glass-select-list a")?.focus());
            e.preventDefault();
          }
        }}
      >
        <span className="glass-select-label">{current ? current.label : placeholder}</span>
        <span className="glass-select-chevron" aria-hidden="true" />
      </button>
      {open && (
        <ul
          className="glass-select-list"
          role="listbox"
          aria-label={placeholder}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") move(e, 1);
            if (e.key === "ArrowUp") move(e, -1);
          }}
        >
          {options.map((o) => (
            <li key={o.key} role="option" aria-selected={o.key === currentKey}>
              <Link href={o.href} className={o.key === currentKey ? "on" : undefined} onClick={() => setOpen(false)}>
                {o.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
