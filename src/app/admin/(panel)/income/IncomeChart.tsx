const DAY = 86_400_000;

type Point = { label: string; amount: number };

/** Adds up income per day (short ranges) or per month (long ones), with empty days shown as gaps. */
export function bucketIncome(orders: { date: Date; amount: number }[]): Point[] {
  if (orders.length === 0) return [];
  const times = orders.map((o) => o.date.getTime());
  const min = Math.min(...times);
  const max = Math.max(...times);
  const byDay = (max - min) / DAY <= 45;
  const out = new Map<string, Point>();
  const key = (d: Date) => (byDay ? d.toISOString().slice(0, 10) : d.toISOString().slice(0, 7));
  const label = (d: Date) => (byDay ? d.toLocaleDateString("he-IL", { day: "numeric", month: "numeric" }) : d.toLocaleDateString("he-IL", { month: "short", year: "2-digit" }));
  // every day (or month) in the range, so a quiet stretch shows as a gap instead of disappearing
  const cursor = new Date(min);
  cursor.setUTCHours(0, 0, 0, 0);
  if (!byDay) cursor.setUTCDate(1);
  while (cursor.getTime() <= max) {
    out.set(key(cursor), { label: label(cursor), amount: 0 });
    if (byDay) cursor.setUTCDate(cursor.getUTCDate() + 1);
    else cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  for (const o of orders) {
    const p = out.get(key(o.date));
    if (p) p.amount += o.amount;
  }
  return [...out.values()];
}

/** A plain bar chart of income over time, drawn as SVG so it needs no library. */
export function IncomeChart({ points }: { points: Point[] }) {
  if (points.length < 2) return null;
  const W = 800, H = 190, padTop = 16, padBottom = 26;
  const max = Math.max(...points.map((p) => p.amount), 1);
  const slot = W / points.length;
  const bar = Math.max(2, slot * 0.66);
  const every = Math.ceil(points.length / 8); // about eight labels along the bottom
  return (
    <figure className="income-chart">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="הכנסות לפי תקופה">
        <line x1="0" y1={H - padBottom} x2={W} y2={H - padBottom} stroke="rgba(255,255,255,.14)" />
        {points.map((p, i) => {
          const h = Math.round(((H - padTop - padBottom) * p.amount) / max);
          const x = i * slot + (slot - bar) / 2;
          return (
            <g key={i}>
              <rect x={x} y={H - padBottom - h} width={bar} height={Math.max(h, p.amount > 0 ? 2 : 0)} rx="2" fill="#d2ad6a">
                <title>{`${p.label}: ₪${Math.round(p.amount).toLocaleString("he-IL")}`}</title>
              </rect>
              {i % every === 0 && (
                <text x={x + bar / 2} y={H - 8} textAnchor="middle" fontSize="11" fill="#a49d90">{p.label}</text>
              )}
            </g>
          );
        })}
        <text x="4" y="11" fontSize="11" fill="#a49d90">{`₪${Math.round(max).toLocaleString("he-IL")}`}</text>
      </svg>
    </figure>
  );
}
