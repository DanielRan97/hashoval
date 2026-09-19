"use client";

import { useEffect, useRef } from "react";

const LOOP_MS = 28_000; // time for the three bottles to pass once

/**
 * The phone version of the home showcase: the three bottles scroll by endlessly. The motion is driven
 * from script rather than a CSS animation, so it does not depend on the browser starting one (some
 * mobile browsers silently skip them). It pauses while off screen, and stays still for people who ask
 * their device to reduce motion; they can swipe the strip instead.
 */
export function HeroSlides({ label }: { label: string }) {
  const track = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = track.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

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
      if (!visible) return;
      const half = el.scrollWidth / 2; // the list is doubled, so one half is exactly one loop
      offset = (offset + (half / LOOP_MS) * dt) % half;
      el.style.transform = `translate3d(${-offset}px, 0, 0)`;
    };
    frame = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  return (
    <div className="hero-slides" role="img" aria-label={label}>
      <div className="hero-track" ref={track} aria-hidden="true">
        {[0, 1, 2, 0, 1, 2].map((_, i) => <div key={i} className="hero-slide" />)}
      </div>
    </div>
  );
}
