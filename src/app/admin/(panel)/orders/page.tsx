import Link from "next/link";
import { db } from "@/lib/db";
import { STATUS_LABELS } from "@/lib/orderFlow";

type Order = Awaited<ReturnType<typeof load>>[number];

function load(where: object) {
  return db.order.findMany({ where, orderBy: { createdAt: "desc" }, include: { items: true } });
}

function Rows({ orders }: { orders: Order[] }) {
  return (
    <div className="table-scroll"><table>
      <thead><tr><th>#</th><th>תאריך</th><th>לקוח</th><th>פריטים</th><th>סה״כ</th><th>סטטוס</th><th></th></tr></thead>
      <tbody>
        {orders.map((o) => (
          <tr key={o.id}>
            <td>{o.id}</td>
            <td>{o.createdAt.toLocaleDateString("he-IL")}</td>
            <td>{o.customerName}</td>
            <td>{o.items.reduce((n, i) => n + i.quantity, 0)}</td>
            <td>₪{o.totalAmount}</td>
            <td>{STATUS_LABELS[o.status] ?? o.status}</td>
            <td><Link href={`/admin/orders/${o.id}`}>פתיחה</Link></td>
          </tr>
        ))}
      </tbody>
    </table></div>
  );
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; from?: string; to?: string }>;
}) {
  const { status, from, to } = await searchParams;
  const where: Record<string, unknown> = {};
  if (status && status in STATUS_LABELS) where.status = status;
  const range: Record<string, Date> = {};
  if (from && !isNaN(Date.parse(from))) range.gte = new Date(from);
  if (to && !isNaN(Date.parse(to))) range.lt = new Date(new Date(to).getTime() + 24 * 3600 * 1000);
  if (range.gte || range.lt) where.createdAt = range;

  const [queue, history] = await Promise.all([load({ status: "paid" }), load(where)]);
  return (
    <>
      <h1>הזמנות</h1>
      <h2>שולמו וממתינות למשלוח ({queue.length})</h2>
      {queue.length === 0 ? <p className="muted">אין הזמנות שממתינות למשלוח.</p> : <Rows orders={queue} />}

      <h2>היסטוריה</h2>
      <form className="filter-form" method="get">
        <select name="status" defaultValue={status ?? ""}>
          <option value="">כל הסטטוסים</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <label>מתאריך <input type="date" name="from" defaultValue={from} /></label>
        <label>עד תאריך <input type="date" name="to" defaultValue={to} /></label>
        <button className="btn ghost">סינון</button>
      </form>
      {history.length === 0 ? <p className="muted">לא נמצאו הזמנות.</p> : <Rows orders={history} />}
    </>
  );
}
