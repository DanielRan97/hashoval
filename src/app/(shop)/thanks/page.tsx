import Link from "next/link";
import { db } from "@/lib/db";
import { mockPaymentsEnabled } from "@/lib/payments";
import { AutoRefresh } from "./AutoRefresh";
import { ClearCart } from "./ClearCart";

export const dynamic = "force-dynamic";

export default async function Thanks({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams;
  const order = t ? await db.order.findUnique({ where: { token: t } }) : null;

  if (!order || !order.paidAt) {
    const pending = order?.status === "pending_payment";
    // Back from a real payment page the confirmation may still be on its way: wait for it instead of asking to pay again.
    const awaiting = pending && !mockPaymentsEnabled();
    return (
      <div className="container prose">
        {awaiting && <AutoRefresh />}
        <h1>{awaiting ? "מאמתים את התשלום" : pending ? "ההזמנה ממתינה לתשלום" : "לא נמצאה הזמנה ששולמה"}</h1>
        {awaiting && <p className="muted">זה לוקח רגע. אם כבר שילמת, העמוד יתעדכן לבד ואין צורך לשלם שוב.</p>}
        {pending && !awaiting && <Link href={`/pay/${order.token}`} className="btn">לתשלום</Link>}
        {!order && <Link href="/shop" className="btn">חזרה לחנות</Link>}
      </div>
    );
  }
  return (
    <div className="container prose">
      <ClearCart />
      <h1>תודה, התשלום התקבל</h1>
      <p>מספר הזמנה: {order.id}</p>
      <p>ההזמנה בטיפול. נשלח אליך מייל כשהיא תצא לדרך.</p>
      <Link href="/shop" className="btn">חזרה לחנות</Link>
    </div>
  );
}
