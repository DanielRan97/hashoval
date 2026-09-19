import Link from "next/link";
import { db } from "@/lib/db";
import { ClearCart } from "./ClearCart";

export const dynamic = "force-dynamic";

export default async function Thanks({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams;
  const order = t ? await db.order.findUnique({ where: { token: t } }) : null;

  if (!order || !order.paidAt) {
    return (
      <div className="container prose">
        <h1>{order?.status === "pending_payment" ? "ההזמנה ממתינה לתשלום" : "לא נמצאה הזמנה ששולמה"}</h1>
        {order?.status === "pending_payment" && <Link href={`/pay/${order.token}`} className="btn">לתשלום</Link>}
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
