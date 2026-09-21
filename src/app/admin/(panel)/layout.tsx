import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { completeShippedOrders } from "@/lib/orderFlow";
import { AdminNav } from "./AdminNav";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  await completeShippedOrders();
  const toShip = await db.order.count({ where: { status: "paid" } }); // paid, waiting to be sent
  return (
    <div className="admin-shell">
      <aside className="admin-side">
        <Link href="/admin" className="admin-brand" aria-label="hashoval, לוח בקרה">
          <img src="/brand/logo-wordmark.png" alt="hashoval" draggable={false} />
        </Link>
        <AdminNav toShip={toShip} />
      </aside>
      <main className="admin-main">{children}</main>
    </div>
  );
}
