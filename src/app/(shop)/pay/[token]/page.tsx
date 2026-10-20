import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { expireUnpaidOrders } from "@/lib/orderFlow";
import { getPaymentProcessor, mockPaymentsEnabled } from "@/lib/payments";
import { mockPay } from "./actions";

export const dynamic = "force-dynamic";

/**
 * With a real provider this page only sends the customer on to the provider's payment page, making a
 * fresh one each time (such links last only minutes). Back from a cancelled or failed payment it offers
 * to try again. In test mode it is the fake payment page.
 */
export default async function PayPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ failed?: string }>;
}) {
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

  if (!mockPaymentsEnabled()) {
    if (failed) {
      return (
        <div className="container prose">
          <h1>התשלום לא הושלם</h1>
          <p>לא בוצע חיוב. הבשמים שמורים לך לזמן קצר, אפשר לנסות שוב.</p>
          <div className="actions">
            <Link href={`/pay/${token}`} className="btn">לנסות שוב</Link>
            <Link href="/cart" className="btn ghost">חזרה לסל</Link>
          </div>
        </div>
      );
    }
    let url: string | null = null;
    try {
      ({ redirectUrl: url } = await getPaymentProcessor().createPayment({
        id: order.id,
        token: order.token ?? token,
        amount: order.totalAmount,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        customerEmail: order.customerEmail,
      }));
    } catch (e) {
      console.error("payment start failed", e);
    }
    if (url) redirect(url);
    return (
      <div className="container prose">
        <h1>לא הצלחנו להתחיל את התשלום</h1>
        <p>נסו שוב בעוד רגע.</p>
        <Link href={`/pay/${token}`} className="btn">לנסות שוב</Link>
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
