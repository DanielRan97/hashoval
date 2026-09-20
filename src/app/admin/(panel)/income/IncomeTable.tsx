import Link from "next/link";

export type IncomeRow = {
  id: number;
  paidAt: string;
  customer: string;
  method: string;
  amount: number;
};

export function IncomeTable({ rows }: { rows: IncomeRow[] }) {
  if (rows.length === 0) return <p className="muted">אין תשלומים בסינון שנבחר.</p>;
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr><th>תאריך תשלום</th><th>הזמנה</th><th>לקוח</th><th>שולם דרך</th><th>סכום</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>{r.paidAt}</td>
              <td><Link href={`/admin/orders/${r.id}`}>{r.id}</Link></td>
              <td>{r.customer}</td>
              <td>{r.method}</td>
              <td className="nowrap">₪{r.amount.toLocaleString("he-IL")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
