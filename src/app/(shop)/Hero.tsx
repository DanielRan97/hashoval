import type { CSSProperties } from "react";
import { HeroSlides } from "./HeroSlides";

/**
 * The home page showcase: one photograph of the three bottles with their ingredients, on a dark
 * glass stage, and "hashoval" in glass beneath it. On phones the photo is split into three swipeable
 * panels, one per bottle.
 */
const ALT = "Creed Wild Vetiver, YSL Babycat Raw Bourbon ו-Initio Musk Therapy, מוקפים במרכיבים שלהם";

// The three bottle columns of the photo, as fractions of its width (the photo is 1683 px wide,
// with the columns dividing at 578 px and 1108 px).
const COLUMNS = [
  { x: 0, w: 578 / 1683 },
  { x: 578 / 1683, w: 530 / 1683 },
  { x: 1108 / 1683, w: 575 / 1683 },
];

export function Hero() {
  return (
    <section className="hero-stage" aria-label="בשמים נבחרים">
      <div className="hero-cols">
        <img className="hero-photo" src="/hero/showcase.webp" alt={ALT} width={1683} height={671} fetchPriority="high" />
        {/* the same photo again, one clipped copy per column; hovering a column enlarges it and dims the others */}
        {COLUMNS.map((c, i) => (
          <div key={i} className="hero-col" style={{ "--x": c.x, "--w": c.w } as CSSProperties} aria-hidden="true">
            <img src="/hero/showcase.webp" alt="" draggable={false} />
          </div>
        ))}
      </div>
      <HeroSlides label={ALT} />
      <GlassWordmark />
    </section>
  );
}

/** "hashoval" as glass lettering: a see-through gradient fill, a bright edge and a specular highlight. */
function GlassWordmark() {
  return (
    <svg className="glass-wordmark" viewBox="0 0 1000 190" role="img" aria-label="hashoval">
      <defs>
        <linearGradient id="letterFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity=".5" />
          <stop offset=".55" stopColor="#ffffff" stopOpacity=".1" />
          <stop offset="1" stopColor="#cfe6ff" stopOpacity=".26" />
        </linearGradient>
        <filter id="letterGlass" x="-5%" y="-30%" width="110%" height="160%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="2.4" result="blur" />
          <feSpecularLighting in="blur" surfaceScale="6" specularConstant=".95" specularExponent="26" lightingColor="#ffffff" result="spec">
            <feDistantLight azimuth="235" elevation="52" />
          </feSpecularLighting>
          <feComposite in="spec" in2="SourceAlpha" operator="in" result="lit" />
          <feMerge>
            <feMergeNode in="SourceGraphic" />
            <feMergeNode in="lit" />
          </feMerge>
        </filter>
      </defs>
      <text
        x="500"
        y="140"
        textAnchor="middle"
        className="wordmark-text"
        fill="url(#letterFill)"
        stroke="rgba(255,255,255,.6)"
        strokeWidth="1.6"
        filter="url(#letterGlass)"
      >
        hashoval
      </text>
    </svg>
  );
}
