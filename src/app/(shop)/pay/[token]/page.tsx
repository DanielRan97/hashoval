import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { expireUnpaidOrders } from "@/lib/orderFlow";
import { mockPaymentsEnabled } from "@/lib/payments";
import { mockPay } from "./actions";

export const dynamic = "force-dynamic";

/** Stand-in for the payment provider's hosted page, for testing only. */
export default async function PayPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ failed?: string }>;
}) {
  if (!mockPaymentsEnabled()) notFound();
  const { token } = await params;
  const { failed } = await searchParams;
  await expireUnpaidOrders();
  const order = await db.order.findUnique({ where: { token }, include: { items: { include: { product: true } } } });
  if (!order) notFound();
  if (order.status !== "pending_payment") {
    if (order.paidAt) redirect(`/thanks?t=${token}`);
    return (
      <div className="container prose">
        <h1>ההזמנה פגה</h1>
        <p>לא התקבל תשלום בזמן, והשריון של הבשמים שוחרר. אפשר להזמין שוב.</p>
        <Link href="/shop" className="btn">חזרה לחנות</Link>
      </div>
    );
  }
  const minutes = order.holdExpiresAt ? Math.max(0, Math.ceil((order.holdExpiresAt.getTime() - Date.now()) / 60000)) : 0;
  const pay = (method: string, outcome: "success" | "fail") => mockPay.bind(null, token, method, outcome);

  return (
    <div className="container prose">
      <p className="notice">מצב בדיקה: זהו דף תשלום מדומה. לא נגבה כסף אמיתי.</p>
      <h1>תשלום</h1>
      {failed && <p className="error" role="alert">התשלום נכשל. אפשר לנסות שוב.</p>}
      <ul className="plain">
        {order.items.map((i) => (
          <li key={i.id} className="cart-line summary-line">
            <div className="cl-name">
              {i.product.brand} · {i.product.name}
              <div className="muted">{i.decantSizeMl} מ״ל · כמות {i.quantity}</div>
            </div>
            <div className="cl-price">₪{i.unitPrice * i.quantity}</div>
          </li>
        ))}
      </ul>
      <dl className="summary">
        <div><dt>משלוח</dt><dd>{order.shippingCost === 0 ? "חינם" : `₪${order.shippingCost}`}</dd></div>
        <div className="total"><dt>סה״כ לתשלום</dt><dd>₪{order.totalAmount}</dd></div>
      </dl>
      <p className="muted">הבשמים שמורים לך עוד כ-{minutes} דקות.</p>

      <div className="pay-methods">
        <form action={pay("apple_pay", "success")}><button className="btn pay-btn">Apple Pay</button></form>
        <form action={pay("google_pay", "success")}><button className="btn pay-btn">Google Pay</button></form>
        <form action={pay("card", "success")}><button className="btn pay-btn">כרטיס אשראי</button></form>
        <form action={pay("card", "fail")}><button className="link">הדמיית כשל בתשלום</button></form>
      </div>
    </div>
  );
}
