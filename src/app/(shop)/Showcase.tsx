"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { PhotoData } from "@/lib/photoFx";
import { Photo } from "./Gallery";

export type ShowcaseItem = { id: number; brand: string; name: string; image: PhotoData; price: string };

const SHOWN = 10;
const SPEED = 42; // pixels per second: slow enough to read, quick enough to feel alive

function pick(all: ShowcaseItem[], avoid: number[]) {
  const fresh = all.filter((p) => !avoid.includes(p.id));
  const pool = fresh.length >= SHOWN ? fresh : all;
  const a = [...pool];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, SHOWN);
}

/**
 * The home page showcase: an endless, slowly gliding strip of perfumes. Moving the mouse onto one
 * stops the motion, turns the others black and white and enlarges that one a little. It can be dragged
 * or swiped, and a button stops it (and shows another ten). The motion is driven from script so it
 * runs the same on every browser, including iPhones; it deliberately ignores "reduce motion" like the
 * earlier carousel did, and the pause button is there for anyone who wants it still.
 */
export function Showcase({ all, initial }: { all: ShowcaseItem[]; initial: ShowcaseItem[] }) {
  const [items, setItems] = useState(initial);
  const [isPaused, setIsPaused] = useState(false);
  const view = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const paused = useRef(false);
  const hover = useRef(false);
  const drag = useRef({ active: false, moved: false, startX: 0, startOffset: 0 });
  const offset = useRef(0);

  // enough copies that one half of the strip is always wider than the screen
  const repeats = Math.max(1, Math.ceil(7 / items.length));
  const half = Array.from({ length: repeats }, () => items).flat();

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    let frame = 0;
    let last = 0;
    const apply = () => {
      const width = el.scrollWidth / 2; // the list is doubled, so one half is exactly one loop
      if (!(width > 0)) return;
      offset.current = ((offset.current % width) + width) % width;
      el.style.transform = `translate3d(${-offset.current}px, 0, 0)`;
    };
    const step = (now: number) => {
      frame = requestAnimationFrame(step);
      const dt = Math.min(64, now - (last || now)); // a long gap (tab in the background) must not make it jump
      last = now;
      if (paused.current || hover.current || drag.current.active) return;
      offset.current += (SPEED * dt) / 1000;
      apply();
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [items]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    drag.current = { active: true, moved: false, startX: e.clientX, startOffset: offset.current };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse") hover.current = !!(e.target as HTMLElement).closest(".showcase-item");
    const d = drag.current;
    if (!d.active) return;
    const dx = e.clientX - d.startX;
    if (!d.moved && Math.abs(dx) > 6) {
      d.moved = true;
      view.current?.setPointerCapture(e.pointerId);
    }
    if (d.moved && track.current) {
      offset.current = d.startOffset - dx;
      const width = track.current.scrollWidth / 2;
      offset.current = ((offset.current % width) + width) % width;
      track.current.style.transform = `translate3d(${-offset.current}px, 0, 0)`;
    }
  };
  const endDrag = () => {
    drag.current.active = false;
  };

  return (
    <div className="showcase">
      <div
        ref={view}
        className="showcase-view"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={(e) => {
          if (e.pointerType === "mouse") hover.current = false;
        }}
        // a drag must not open the perfume it ended on
        onClickCapture={(e) => {
          if (drag.current.moved) {
            e.preventDefault();
            e.stopPropagation();
            drag.current.moved = false;
          }
        }}
      >
        <div className="showcase-track" ref={track}>
          {[0, 1].map((copy) =>
            half.map((p, i) => (
              <Link
                key={`${copy}-${i}`}
                href={`/product/${p.id}`}
                className="showcase-item"
                draggable={false}
                aria-hidden={copy === 1 || undefined}
                tabIndex={copy === 1 ? -1 : undefined}
              >
                <span className="showcase-photo">
                  <Photo src={p.image.url} fx={p.image} alt={copy === 0 ? `${p.brand} ${p.name}` : ""} eager={copy === 0 && i < 4} />
                </span>
                <span className="showcase-caption">
                  <span className="showcase-brand">{p.brand}</span>
                  <span className="showcase-name">{p.name}</span>
                  <span className="showcase-price">{p.price}</span>
                </span>
              </Link>
            )),
          )}
        </div>
      </div>
      <div className="showcase-tools">
        <button
          type="button"
          className="showcase-btn"
          aria-pressed={isPaused}
          onClick={() => {
            paused.current = !paused.current;
            setIsPaused(paused.current);
          }}
        >
          {isPaused ? "▶ המשך" : "❚❚ עצור"}
        </button>
        {all.length > SHOWN && (
          <button type="button" className="showcase-btn" onClick={() => setItems(pick(all, items.map((p) => p.id)))}>
            עוד {SHOWN} אחרים
          </button>
        )}
      </div>
    </div>
  );
}
