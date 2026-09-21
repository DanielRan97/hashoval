"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "../actions";
import { OrdersBadge } from "./OrdersBadge";

const LINKS = [
  { href: "/admin", label: "לוח בקרה", exact: true },
  { href: "/admin/orders", label: "הזמנות", badge: true },
  { href: "/admin/products", label: "מוצרים" },
  { href: "/admin/vials", label: "בקבוקונים" },
  { href: "/admin/income", label: "הכנסות" },
  { href: "/admin/brands", label: "חברות" },
  { href: "/admin/settings", label: "הגדרות" },
  { href: "/admin/backup", label: "גיבוי" },
] as const;

/** The admin's side menu. The current section is highlighted; on a phone it becomes a row that scrolls sideways. */
export function AdminNav({ toShip }: { toShip: number }) {
  const path = usePathname();
  return (
    <nav className="admin-nav" aria-label="ניהול">
      {LINKS.map((l) => {
        const active = "exact" in l && l.exact ? path === l.href : path === l.href || path.startsWith(l.href + "/");
        return (
          <Link key={l.href} href={l.href} className={active ? "active" : undefined} aria-current={active ? "page" : undefined}>
            {l.label}
            {"badge" in l && <OrdersBadge initial={toShip} />}
          </Link>
        );
      })}
      <span className="admin-nav-gap" />
      <Link href="/" target="_blank" rel="noopener" className="admin-nav-out">לחנות ↗</Link>
      <form action={logout}>
        <button type="submit" className="admin-nav-out">יציאה</button>
      </form>
    </nav>
  );
}
