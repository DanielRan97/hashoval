const ICON = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.3, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;

/** Three small promises, so a first-time visitor knows why to trust the shop. */
export function Trust({ freeShippingFrom }: { freeShippingFrom: number }) {
  return (
    <section className="trust" aria-label="למה hashoval">
      <div className="trust-item">
        <svg {...ICON}><path d="M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6l8-3z" /><path d="M9 12l2 2 4-4" /></svg>
        <strong>בשמים מקוריים בלבד</strong>
        <span>מבקבוקים מקוריים, בלי חיקויים</span>
      </div>
      <div className="trust-item">
        <svg {...ICON}><path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z" /><path d="M9.5 14.5a2.5 2.5 0 0 0 2.5 2.5" /></svg>
        <strong>דוגמיות במידות שונות</strong>
        <span><bdi dir="ltr">2, 3, 5, 10</bdi> מ״ל, לחיות עם הריח לפני שמחליטים</span>
      </div>
      <div className="trust-item">
        <svg {...ICON}><path d="M3 7h11v9H3z" /><path d="M14 10h4l3 3v3h-7z" /><circle cx="7" cy="18" r="1.6" /><circle cx="17" cy="18" r="1.6" /></svg>
        <strong>משלוח לכל הארץ</strong>
        <span>חינם בהזמנה מעל ₪{freeShippingFrom}</span>
      </div>
    </section>
  );
}
