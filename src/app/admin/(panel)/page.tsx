import Link from "next/link";
import { db, getSettings } from "@/lib/db";
import { INCOME_STATUSES, STATUS_LABELS } from "@/lib/orderFlow";
import { sellableMl } from "@/lib/pricing";
import { VIAL_SIZES, vialLevel, vialStock } from "@/lib/vials";

export const dynamic = "force-dynamic";

const money = (n: number) => `₪${Math.round(n).toLocaleString("he-IL")}`;

export default async function Dashboard() {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const [toShip, monthOrders, products, recent, s] = await Promise.all([
    db.order.count({ where: { status: "paid" } }),
    db.order.findMany({
      where: { status: { in: INCOME_STATUSES }, refundedAt: null, OR: [{ paidAt: { gte: startOfMonth } }, { paidAt: null, createdAt: { gte: startOfMonth } }] },
      include: { items: { include: { product: { select: { brand: true, name: true } } } } },
    }),
    db.product.findMany({ where: { isActive: true }, orderBy: [{ brand: "asc" }, { name: "asc" }] }),
    db.order.findMany({ orderBy: { createdAt: "desc" }, take: 6 }),
    getSettings(),
  ]);

  const revenue = monthOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const decants = monthOrders.reduce((sum, o) => sum + o.items.reduce((n, i) => n + i.quantity, 0), 0);
  const units = new Map<string, number>();
  for (const o of monthOrders) for (const i of o.items) {
    const name = `${i.product.brand} ${i.product.name}`;
    units.set(name, (units.get(name) ?? 0) + i.quantity);
  }
  const best = [...units].sort((a, b) => b[1] - a[1])[0];
  const low = products.filter((p) => sellableMl(p, s) < s.lowStockThresholdMl);
  const vialAlerts = VIAL_SIZES.map((size) => ({ size, level: vialLevel(s, size), left: vialStock(s, size) })).filter(
    (v) => v.level === "low" || v.level === "out",
  );

  return (
    <>
      <h1>לוח בקרה</h1>
      {vialAlerts.length > 0 && (
        <div className="notice" role="alert">
          <strong>בקבוקוני דוגמית מתמעטים:</strong>{" "}
          {vialAlerts.map((v) => `${v.size} מ״ל ${v.level === "out" ? "אזלו" : `נשארו ${v.left}`}`).join(" · ")}{" "}
          · <Link href="/admin/vials">לעדכון המלאי</Link>
        </div>
      )}

      <div className="kpis">
        <Link href="/admin/orders" className="stat">
          <span className={toShip > 0 ? "num warn" : "num"}>{toShip}</span>
          <span className="muted">ממתינות למשלוח</span>
        </Link>
        <Link href="/admin/income" className="stat">
          <span className="num">{money(revenue)}</span>
          <span className="muted">הכנסות החודש</span>
        </Link>
        <div className="stat">
          <span className="num">{monthOrders.length}</span>
          <span className="muted">הזמנות החודש</span>
        </div>
        <div className="stat">
          <span className="num">{monthOrders.length ? money(revenue / monthOrders.length) : "—"}</span>
          <span className="muted">ממוצע להזמנה</span>
        </div>
        <div className="stat">
          <span className="num">{decants}</span>
          <span className="muted">דוגמיות שנמכרו החודש</span>
        </div>
        <div className="stat">
          <span className="num kpi-text">{best ? best[0] : "—"}</span>
          <span className="muted">{best ? `הכי נמכר החודש (${best[1]} יח׳)` : "הכי נמכר החודש"}</span>
        </div>
      </div>

      <div className="dash-cols">
        <section>
          <h2>הזמנות אחרונות</h2>
          {recent.length === 0 ? (
            <p className="muted">עוד אין הזמנות.</p>
          ) : (
            <div className="table-scroll">
              <table>
                <thead><tr><th>#</th><th>לקוח</th><th>סכום</th><th>סטטוס</th></tr></thead>
                <tbody>
                  {recent.map((o) => (
                    <tr key={o.id}>
                      <td><Link href={`/admin/orders/${o.id}`}>{o.id}</Link></td>
                      <td>{o.customerName}</td>
                      <td className="nowrap">{money(o.totalAmount)}</td>
                      <td>{STATUS_LABELS[o.status] ?? o.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        <section>
          <h2>דורשים מילוי מחדש</h2>
          {low.length === 0 ? (
            <p className="muted">אין בשמים במלאי נמוך.</p>
          ) : (
            <ul className="plain">
              {low.map((p) => (
                <li key={p.id}>
                  <Link href={`/admin/products/${p.id}`}>{p.brand} · {p.name}</Link>{" "}
                  <span className="warn">{sellableMl(p, s).toFixed(1)} מ״ל נטו</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
