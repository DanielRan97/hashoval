"use client";

import { useEffect, useRef, useState } from "react";

const LOOP_MS = 28_000; // time for the three bottles to pass once

type Mode = "transform" | "scroll";
type Stats = { frames: number; visible: boolean; offset: number; half: number };

/**
 * The phone version of the home showcase: the three bottles scroll by endlessly. The motion is driven
 * from script rather than a CSS animation, so it does not depend on the browser starting one. It
 * pauses while off screen. It deliberately does not follow the device's "reduce motion" setting (the
 * owner wants it always moving); a small button lets anyone stop and resume it instead.
 *
 * Two ways of moving the strip exist, because some browsers treat them differently: "transform"
 * (default) shifts the strip, "scroll" scrolls its container. For diagnosing a device, open the page
 * with ?debug=1 to see live numbers, and ?mode=scroll to try the other way.
 */
export function HeroSlides({ label }: { label: string }) {
  const box = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const paused = useRef(false);
  const stats = useRef<Stats>({ frames: 0, visible: true, offset: 0, half: 0 });
  const [isPaused, setIsPaused] = useState(false);
  const [mode, setMode] = useState<Mode>("transform");
  const [debug, setDebug] = useState<string | null>(null);

  // read the diagnostic switches after mount, so the server and first client render agree
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get("mode") === "scroll") setMode("scroll");
    if (q.has("debug")) setDebug("starting…");
  }, []);

  useEffect(() => {
    const el = track.current;
    const scroller = box.current;
    if (!el || !scroller) return;

    let frame = 0;
    let offset = 0;
    let last = 0;
    const s = stats.current;
    s.visible = true;
    const observer = new IntersectionObserver(([entry]) => {
      s.visible = entry.isIntersecting;
    });
    observer.observe(scroller);

    const step = (now: number) => {
      frame = requestAnimationFrame(step);
      s.frames++;
      const dt = Math.min(64, now - (last || now)); // a long gap (tab in the background) must not make it jump
      last = now;
      if (!s.visible || paused.current) return;
      const half = el.scrollWidth / 2; // the list is doubled, so one half is exactly one loop
      s.half = half;
      offset = (offset + (half / LOOP_MS) * dt) % half;
      s.offset = offset;
      if (mode === "scroll") scroller.scrollLeft = offset;
      else el.style.transform = `translate3d(${-offset}px, 0, 0)`;
    };
    frame = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      el.style.transform = "";
    };
  }, [mode]);

  useEffect(() => {
    if (debug === null) return;
    const id = setInterval(() => {
      const s = stats.current;
      setDebug(
        `mode=${mode} frames=${s.frames} visible=${s.visible} offset=${Math.round(s.offset)} half=${Math.round(s.half)} ` +
          `paused=${paused.current} reduce=${window.matchMedia("(prefers-reduced-motion: reduce)").matches} w=${window.innerWidth}`,
      );
    }, 500);
    return () => clearInterval(id);
  }, [debug === null, mode]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <div className={mode === "scroll" ? "hero-slides scroll" : "hero-slides"} role="img" aria-label={label} ref={box}>
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
      {debug !== null && <pre className="hero-debug">{debug}</pre>}
    </>
  );
}
