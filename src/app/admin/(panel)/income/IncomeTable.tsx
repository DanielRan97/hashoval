"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { ConfirmButton } from "../ConfirmButton";
import { setPayout, type PayoutResult } from "./actions";

export type IncomeRow = {
  id: number;
  paidAt: string;
  customer: string;
  method: string;
  amount: number;
  payoutDate: string | null;
  payoutAccount: string | null;
};

export function IncomeTable({ rows, accounts }: { rows: IncomeRow[]; accounts: string[] }) {
  const [result, action, pending] = useActionState<PayoutResult, FormData>(setPayout, null);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const allSelected = rows.length > 0 && selected.size === rows.length;
  const toggle = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  const selectedTotal = rows.filter((r) => selected.has(r.id)).reduce((s, r) => s + r.amount, 0);

  return (
    <form action={action}>
      <div className="payout-box">
        <strong>סימון העברה לחשבון בנק</strong>
        <p className="muted">
          בחר הזמנות בטבלה ורשום לאיזה חשבון והתאריך שבו הכסף הגיע. נבחרו {selected.size} הזמנות, ₪{selectedTotal.toLocaleString("he-IL")}.
        </p>
        <div className="action-row">
          <input name="payoutAccount" list="payout-accounts" placeholder="חשבון בנק (למשל: לאומי ****1234)" />
          <datalist id="payout-accounts">{accounts.map((a) => <option key={a} value={a} />)}</datalist>
          <input type="date" name="payoutDate" aria-label="תאריך העברה" />
          <ConfirmButton
            className="btn"
            name="intent"
            value="set"
            disabled={pending || selected.size === 0}
            title="אישור סימון העברה"
            message={(f) => {
              const d = new FormData(f);
              return `לסמן ${selected.size} הזמנות (₪${selectedTotal.toLocaleString("he-IL")}) כהועברו ל-${d.get("payoutAccount") || "?"} בתאריך ${d.get("payoutDate") || "?"}?`;
            }}
          >
            סימון כהועבר
          </ConfirmButton>
          <ConfirmButton
            className="btn ghost"
            name="intent"
            value="clear"
            disabled={pending || selected.size === 0}
            title="אישור ביטול סימון"
            message={`לבטל את סימון ההעברה ב-${selected.size} הזמנות?`}
          >
            ביטול סימון
          </ConfirmButton>
        </div>
        {result && <p className={result.ok ? "notice" : "error"} role="status">{result.msg}</p>}
      </div>

      {rows.length === 0 ? (
        <p className="muted">אין תשלומים בסינון שנבחר.</p>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    aria-label="בחירת הכל"
                    checked={allSelected}
                    onChange={() => setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)))}
                  />
                </th>
                <th>תאריך תשלום</th><th>הזמנה</th><th>לקוח</th><th>שולם דרך</th><th>סכום</th><th>הועבר אליי</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <input type="checkbox" name="orderId" value={r.id} checked={selected.has(r.id)} onChange={() => toggle(r.id)} aria-label={`בחירת הזמנה ${r.id}`} />
                  </td>
                  <td>{r.paidAt}</td>
                  <td><Link href={`/admin/orders/${r.id}`}>{r.id}</Link></td>
                  <td>{r.customer}</td>
                  <td>{r.method}</td>
                  <td className="nowrap">₪{r.amount.toLocaleString("he-IL")}</td>
                  <td>{r.payoutDate ? `${r.payoutDate}${r.payoutAccount ? ` · ${r.payoutAccount}` : ""}` : <span className="muted">טרם הועבר</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </form>
  );
}
