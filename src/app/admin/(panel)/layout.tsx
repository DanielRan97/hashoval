import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { completeShippedOrders } from "@/lib/orderFlow";
import { logout } from "../actions";
import { OrdersBadge } from "./OrdersBadge";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  await completeShippedOrders();
  const toShip = await db.order.count({ where: { status: "paid" } }); // paid, waiting to be sent
  return (
    <>
      <nav className="nav">
        <strong>hashoval</strong>
        <Link href="/admin">לוח בקרה</Link>
        <Link href="/admin/orders">
          הזמנות
          <OrdersBadge initial={toShip} />
        </Link>
        <Link href="/admin/income">הכנסות</Link>
        <Link href="/admin/products">מוצרים</Link>
        <Link href="/admin/brands">חברות</Link>
        <Link href="/admin/vials">בקבוקונים</Link>
        <Link href="/admin/settings">הגדרות</Link>
        <Link href="/admin/backup">גיבוי</Link>
        <span className="grow" />
        <Link href="/" target="_blank" rel="noopener">לחנות ↗</Link>
        <form action={logout}><button className="btn ghost">יציאה</button></form>
      </nav>
      <main className="container">{children}</main>
    </>
  );
}
