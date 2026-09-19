"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart";
import { IconBag } from "./NavIcons";

export function CartLink() {
  const { items, ready } = useCart();
  const count = ready ? items.reduce((n, i) => n + i.quantity, 0) : 0;
  return (
    <Link href="/cart" className="nav-icon" data-label="סל" aria-label={count > 0 ? `סל קניות, ${count} פריטים` : "סל קניות"}>
      <IconBag />
      {count > 0 && <span className="nav-count" aria-hidden="true">{count}</span>}
    </Link>
  );
}
