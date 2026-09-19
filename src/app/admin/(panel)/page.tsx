import Link from "next/link";
import { db, getSettings } from "@/lib/db";
import { INCOME_STATUSES } from "@/lib/orderFlow";
import { sellableMl } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const [pending, revenue, products, s] = await Promise.all([
    db.order.count({ where: { status: "paid" } }),
    db.order.aggregate({
      _sum: { totalAmount: true },
      where: { status: { in: INCOME_STATUSES }, refundedAt: null, OR: [{ paidAt: { gte: startOfMonth } }, { paidAt: null, createdAt: { gte: startOfMonth } }] },
    }),
    db.product.findMany({ where: { isActive: true }, orderBy: [{ brand: "asc" }, { name: "asc" }] }),
    getSettings(),
  ]);
  const low = products.filter((p) => sellableMl(p, s) < s.lowStockThresholdMl);
  return (
    <>
      <h1>לוח בקרה</h1>
      <div className="stats">
        <Link href="/admin/orders" className="stat">
          <span className={pending > 0 ? "num warn" : "num"}>{pending}</span>
          <span className="muted">הזמנות ששולמו וממתינות למשלוח</span>
        </Link>
        <div className="stat">
          <span className="num">₪{Math.round(revenue._sum.totalAmount ?? 0)}</span>
          <span className="muted">הכנסות החודש (הזמנות ששולמו)</span>
        </div>
      </div>
      <h2>מלאי נמוך</h2>
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
    </>
  );
}
