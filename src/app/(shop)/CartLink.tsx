"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart";

export function CartLink() {
  const { items, ready } = useCart();
  const count = ready ? items.reduce((n, i) => n + i.quantity, 0) : 0;
  return <Link href="/cart">סל{count > 0 && ` (${count})`}</Link>;
}
