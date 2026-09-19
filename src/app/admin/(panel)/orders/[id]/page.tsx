import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { STATUS_LABELS } from "@/lib/orderFlow";
import { PAYMENT_METHOD_LABELS } from "@/lib/payments";
import { OrderActions } from "./OrderActions";

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const orderId = Number(id);
  if (!Number.isInteger(orderId)) notFound();
  const o = await db.order.findUnique({ where: { id: orderId }, include: { items: { include: { product: true } } } });
  if (!o) notFound();
  return (
    <>
      <p><Link href="/admin/orders">→ להזמנות</Link></p>
      <h1>הזמנה {o.id}</h1>
      <p><strong>{STATUS_LABELS[o.status] ?? o.status}</strong> · {o.createdAt.toLocaleString("he-IL")}</p>
      <dl className="details">
        <dt>לקוח</dt><dd>{o.customerName}</dd>
        <dt>טלפון</dt><dd dir="ltr" style={{ textAlign: "start" }}>{o.customerPhone}</dd>
        <dt>אימייל</dt><dd>{o.customerEmail ?? "—"}</dd>
        <dt>כתובת</dt><dd>{o.customerAddress}</dd>
        {o.paidAt && (<><dt>תשלום</dt><dd>{PAYMENT_METHOD_LABELS[o.paymentMethod ?? ""] ?? "ידני"} · {o.paidAt.toLocaleString("he-IL")}</dd></>)}
        {o.providerTxnId && (<><dt>מזהה עסקה</dt><dd dir="ltr" style={{ textAlign: "start" }}>{o.providerTxnId}</dd></>)}
        {o.refundedAt && (<><dt>הוחזר</dt><dd>{o.refundedAt.toLocaleString("he-IL")}</dd></>)}
        {o.payoutDate && (<><dt>הועבר אליי</dt><dd>{o.payoutDate.toLocaleDateString("he-IL")}{o.payoutAccount ? ` · ${o.payoutAccount}` : ""}</dd></>)}
        {o.trackingNumber && (<><dt>מספר מעקב</dt><dd>{o.trackingNumber}</dd></>)}
        {o.rejectionReason && (<><dt>סיבת ביטול</dt><dd>{o.rejectionReason}</dd></>)}
      </dl>
      <div className="table-scroll"><table>
        <thead><tr><th>בושם</th><th>גודל</th><th>כמות</th><th>מחיר ליחידה</th><th>סה״כ</th></tr></thead>
        <tbody>
          {o.items.map((i) => (
            <tr key={i.id}>
              <td>{i.product.brand} · {i.product.name}</td>
              <td>{i.decantSizeMl} מ״ל</td>
              <td>{i.quantity}</td>
              <td>₪{i.unitPrice}</td>
              <td>₪{i.unitPrice * i.quantity}</td>
            </tr>
          ))}
        </tbody>
      </table></div>
      <p>משלוח: {o.shippingCost === 0 ? "חינם" : `₪${o.shippingCost}`} · <strong>סה״כ לתשלום: ₪{o.totalAmount}</strong></p>
      <OrderActions id={o.id} status={o.status} paid={!!o.paidAt && !o.refundedAt} />
    </>
  );
}
