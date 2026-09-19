"use client";

import { useEffect, useRef, useState } from "react";

const LOOP_MS = 28_000; // time for the three bottles to pass once
const SLOW_LOOP_MS = 90_000; // the same, for people who asked their device to reduce motion

/**
 * The phone version of the home showcase: the three bottles scroll by endlessly. The motion is driven
 * from script rather than a CSS animation, so it does not depend on the browser starting one (some
 * mobile browsers silently skip them). It pauses while off screen. Under "reduce motion" it keeps
 * going but three times slower, and a small button lets anyone stop and resume it.
 */
export function HeroSlides({ label }: { label: string }) {
  const track = useRef<HTMLDivElement>(null);
  const paused = useRef(false);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const loopMs = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? SLOW_LOOP_MS : LOOP_MS;

    let frame = 0;
    let offset = 0;
    let last = 0;
    let visible = true;
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    observer.observe(el);

    const step = (now: number) => {
      frame = requestAnimationFrame(step);
      const dt = Math.min(64, now - (last || now)); // a long gap (tab in the background) must not make it jump
      last = now;
      if (!visible || paused.current) return;
      const half = el.scrollWidth / 2; // the list is doubled, so one half is exactly one loop
      offset = (offset + (half / loopMs) * dt) % half;
      el.style.transform = `translate3d(${-offset}px, 0, 0)`;
    };
    frame = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  return (
    <>
      <div className="hero-slides" role="img" aria-label={label}>
        <div className="hero-track" ref={track} aria-hidden="true">
          {[0, 1, 2, 0, 1, 2].map((_, i) => <div key={i} className="hero-slide" />)}
        </div>
      </div>
      <button
        type="button"
        className="hero-pause"
        aria-pressed={isPaused}
        aria-label={isPaused ? "הפעלת התנועה" : "עצירת התנועה"}
        onClick={() => {
          paused.current = !paused.current;
          setIsPaused(paused.current);
        }}
      >
        {isPaused ? (
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" fill="currentColor" /></svg>
        ) : (
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5h3v14H8zM13 5h3v14h-3z" fill="currentColor" /></svg>
        )}
      </button>
    </>
  );
}
