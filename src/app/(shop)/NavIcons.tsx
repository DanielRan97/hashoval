/** Line icons for the top navigation. Drawn in the current text colour; the link around them carries the label. */
const base = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;

/** A perfume bottle: the shop. */
export function IconShop() {
  return (
    <svg {...base}>
      <rect x="8.5" y="2" width="7" height="3.6" rx="1.2" />
      <path d="M10.6 5.6v1.8h2.8V5.6" />
      <rect x="4.8" y="7.4" width="14.4" height="14.1" rx="3.2" />
      <rect x="8.4" y="11.6" width="7.2" height="5.2" rx="1.1" />
    </svg>
  );
}

/** An "i" in a circle: about. */
export function IconAbout() {
  return (
    <svg {...base}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5.2" />
      <circle cx="12" cy="7.9" r=".6" fill="currentColor" />
    </svg>
  );
}

/** A shopping bag: the cart. */
export function IconBag() {
  return (
    <svg {...base}>
      <path d="M5.2 8h13.6l-1 12.2a1.3 1.3 0 0 1-1.3 1.2H7.5a1.3 1.3 0 0 1-1.3-1.2z" />
      <path d="M8.8 8V6.6a3.2 3.2 0 0 1 6.4 0V8" />
    </svg>
  );
}
