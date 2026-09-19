/** Uses the #brass and #glass gradients defined once in GlassDefs (shop layout). */
export function EmptyBottle() {
  return (
    <svg className="bottle" viewBox="0 0 120 160" role="img" aria-label="בקבוק זכוכית ריק">
      {/* cap and collar */}
      <rect x="42" y="6" width="36" height="26" rx="4" fill="url(#brass)" />
      <rect x="46" y="32" width="28" height="9" rx="2" fill="url(#brass)" opacity=".75" />
      {/* thick glass body */}
      <rect x="14" y="41" width="92" height="112" rx="15" fill="url(#glass)" stroke="rgba(20,45,70,.28)" strokeWidth="1.4" />
      <rect x="22" y="49" width="76" height="96" rx="10" fill="none" stroke="rgba(255,255,255,.95)" strokeWidth="1.4" />
      {/* the solid glass base of an empty bottle */}
      <rect x="23" y="126" width="74" height="18" rx="7" fill="rgba(20,45,70,.07)" />
      {/* light on the glass */}
      <path d="M30 58 L44 58 L30 118 Z" fill="rgba(255,255,255,.75)" />
      <rect x="90" y="56" width="3" height="62" rx="1.5" fill="rgba(255,255,255,.85)" />
    </svg>
  );
}

/** Rendered once per page; the bottle above references these by id. */
export function GlassDefs() {
  return (
    <svg width="0" height="0" aria-hidden="true" style={{ position: "absolute" }}>
      <defs>
        <linearGradient id="brass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ecd39a" />
          <stop offset=".5" stopColor="#a67c3d" />
          <stop offset="1" stopColor="#dcb978" />
        </linearGradient>
        <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity=".85" />
          <stop offset="1" stopColor="#dbe6eb" stopOpacity=".35" />
        </linearGradient>
        {/* a wavy lens, used through backdrop-filter to bend what shows behind the header, dropdowns and dialogs */}
        <filter id="lens" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.010 0.018" numOctaves="2" seed="4" result="waves" />
          <feDisplacementMap in="SourceGraphic" in2="waves" scale="22" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
    </svg>
  );
}
