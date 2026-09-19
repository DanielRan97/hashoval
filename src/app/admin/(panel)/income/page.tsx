import { db } from "@/lib/db";
import { incomeWhere, parseRange, PERIOD_LABELS, resolvePeriod, type IncomeFilter } from "@/lib/income";
import { PAYMENT_METHOD_LABELS } from "@/lib/payments";
import { IncomeTable, type IncomeRow } from "./IncomeTable";

export const dynamic = "force-dynamic";

type Params = {
  period?: string;
  from?: string;
  to?: string;
  method?: string;
  payout?: string;
  account?: string;
  pFrom?: string;
  pTo?: string;
};

const money = (n: number) => `₪${Math.round(n).toLocaleString("he-IL")}`;
const methodLabel = (m: string | null) => (m ? (PAYMENT_METHOD_LABELS[m] ?? m) : "ידני (ביט/העברה)");
const fmt = (d: Date) => d.toLocaleDateString("he-IL");

export default async function IncomePage({ searchParams }: { searchParams: Promise<Params> }) {
  const p = await searchParams;
  const period = p.period && p.period in PERIOD_LABELS ? p.period : "month";
  const filter: IncomeFilter = {
    paid: resolvePeriod(period, p.from, p.to),
    method: p.method || undefined,
    payout: p.payout === "done" || p.payout === "pending" ? p.payout : undefined,
    account: p.account || undefined,
    payoutDates: parseRange(p.pFrom, p.pTo),
  };

  const [orders, knownAccounts, refunds] = await Promise.all([
    db.order.findMany({ where: incomeWhere(filter), orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }] }),
    db.order.findMany({ where: { payoutAccount: { not: null } }, select: { payoutAccount: true }, distinct: ["payoutAccount"] }),
    db.order.aggregate({
      _sum: { totalAmount: true },
      _count: true,
      where: {
        refundedAt: filter.paid.from || filter.paid.to
          ? { ...(filter.paid.from && { gte: filter.paid.from }), ...(filter.paid.to && { lt: filter.paid.to }) }
          : { not: null },
      },
    }),
  ]);
  const accounts = knownAccounts.map((a) => a.payoutAccount!).sort();

  const total = orders.reduce((s, o) => s + o.totalAmount, 0);
  const transferred = orders.filter((o) => o.payoutDate).reduce((s, o) => s + o.totalAmount, 0);
  const byMethod = new Map<string, { count: number; sum: number }>();
  for (const o of orders) {
    const key = o.paymentMethod ?? "manual";
    const cur = byMethod.get(key) ?? { count: 0, sum: 0 };
    byMethod.set(key, { count: cur.count + 1, sum: cur.sum + o.totalAmount });
  }
  const byAccount = new Map<string, number>();
  for (const o of orders) if (o.payoutDate) byAccount.set(o.payoutAccount ?? "לא צוין", (byAccount.get(o.payoutAccount ?? "לא צוין") ?? 0) + o.totalAmount);

  const rows: IncomeRow[] = orders.map((o) => ({
    id: o.id,
    paidAt: fmt(o.paidAt ?? o.createdAt),
    customer: o.customerName,
    method: methodLabel(o.paymentMethod),
    amount: o.totalAmount,
    payoutDate: o.payoutDate ? fmt(o.payoutDate) : null,
    payoutAccount: o.payoutAccount,
  }));

  return (
    <>
      <h1>הכנסות</h1>

      <form className="filter-form income-filters" method="get">
        <label>
          תקופה
          <select name="period" defaultValue={period}>
            {Object.entries(PERIOD_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <label>מתאריך <input type="date" name="from" defaultValue={p.from} /></label>
        <label>עד תאריך <input type="date" name="to" defaultValue={p.to} /></label>
        <label>
          שולם דרך
          <select name="method" defaultValue={p.method ?? ""}>
            <option value="">הכל</option>
            {Object.entries(PAYMENT_METHOD_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            <option value="manual">ידני (ביט/העברה)</option>
          </select>
        </label>
        <label>
          העברה לבנק
          <select name="payout" defaultValue={p.payout ?? ""}>
            <option value="">הכל</option>
            <option value="done">הועבר</option>
            <option value="pending">טרם הועבר</option>
          </select>
        </label>
        <label>
          חשבון
          <select name="account" defaultValue={p.account ?? ""}>
            <option value="">כל החשבונות</option>
            {accounts.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </label>
        <label>הועבר מתאריך <input type="date" name="pFrom" defaultValue={p.pFrom} /></label>
        <label>הועבר עד תאריך <input type="date" name="pTo" defaultValue={p.pTo} /></label>
        <button className="btn ghost">סינון</button>
      </form>
      <p className="muted">
        {PERIOD_LABELS[period]}
        {period === "custom" && " (נבחר לפי שדות התאריך)"} · התאריך הוא תאריך התשלום. הזמנות שבוטלו והוחזרו לא נספרות.
      </p>

      <div className="stats">
        <div className="stat"><span className="num">{money(total)}</span><span className="muted">הכנסות ({orders.length} הזמנות)</span></div>
        <div className="stat"><span className="num">{orders.length ? money(total / orders.length) : "—"}</span><span className="muted">ממוצע להזמנה</span></div>
        <div className="stat"><span className="num">{money(transferred)}</span><span className="muted">כבר הועבר לחשבון</span></div>
        <div className="stat"><span className="num">{money(total - transferred)}</span><span className="muted">טרם הועבר</span></div>
        <div className="stat"><span className="num warn">{money(refunds._sum.totalAmount ?? 0)}</span><span className="muted">הוחזרו ללקוחות ({refunds._count})</span></div>
      </div>

      <div className="breakdowns">
        <div>
          <h2>לפי אמצעי תשלום</h2>
          {byMethod.size === 0 ? <p className="muted">אין נתונים.</p> : (
            <table>
              <thead><tr><th>אמצעי</th><th>הזמנות</th><th>סכום</th></tr></thead>
              <tbody>
                {[...byMethod].map(([k, v]) => (
                  <tr key={k}><td>{methodLabel(k === "manual" ? null : k)}</td><td>{v.count}</td><td>{money(v.sum)}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div>
          <h2>לפי חשבון שאליו הועבר</h2>
          {byAccount.size === 0 ? <p className="muted">עוד לא סומנו העברות.</p> : (
            <table>
              <thead><tr><th>חשבון</th><th>סכום</th></tr></thead>
              <tbody>
                {[...byAccount].map(([k, v]) => <tr key={k}><td>{k}</td><td>{money(v)}</td></tr>)}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <h2>תשלומים</h2>
      <p>
        <a className="btn ghost sm" href={`/admin/income/export?${new URLSearchParams(Object.entries(p).filter(([, v]) => v) as [string, string][]).toString()}`}>
          ייצוא ל-Excel (לפי הסינון שנבחר)
        </a>
      </p>
      <IncomeTable rows={rows} accounts={accounts} />
    </>
  );
}
