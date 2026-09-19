"use client";

import Link from "next/link";
import { MAX_QTY, useCart, useCartCleanup } from "@/lib/cart";
import type { StoreProduct } from "@/lib/catalog";
import { shippingFor } from "@/lib/pricing";
import { RemovedNotice } from "./RemovedNotice";

export function OrderSummary({ subtotal, threshold, standard }: { subtotal: number; threshold: number; standard: number }) {
  const shipping = shippingFor(subtotal, threshold, standard);
  return (
    <dl className="summary">
      <div><dt>סכום ביניים</dt><dd>₪{subtotal}</dd></div>
      <div><dt>משלוח</dt><dd>{shipping === 0 ? "חינם" : `₪${shipping}`}</dd></div>
      <div className="total"><dt>סה״כ</dt><dd>₪{subtotal + shipping}</dd></div>
      {shipping > 0 && <p className="muted">משלוח חינם בהזמנה מעל ₪{threshold} (חסרים ₪{Math.ceil(threshold - subtotal)})</p>}
    </dl>
  );
}

export function CartView({
  catalog,
  freeShippingThreshold,
  standardShippingCost,
}: {
  catalog: StoreProduct[];
  freeShippingThreshold: number;
  standardShippingCost: number;
}) {
  const { ready, setQuantity, remove } = useCart();
  const { lines, removed, subtotal } = useCartCleanup(catalog);

  if (!ready) return null;
  if (lines.length === 0) {
    return (
      <>
        <RemovedNotice removed={removed} />
        <p className="muted">הסל ריק.</p>
        <Link href="/shop" className="btn">לחנות</Link>
      </>
    );
  }
  return (
    <>
      <RemovedNotice removed={removed} />
      <ul className="plain cart-lines">
        {lines.map((l) => (
          <li key={`${l.productId}-${l.size}`} className="cart-line">
            <div className="cl-name">
              {l.brand} · {l.name}
              <div className="muted">{l.size} מ״ל</div>
            </div>
            <input
              className="qty"
              type="number"
              min={1}
              max={MAX_QTY}
              value={l.quantity}
              aria-label="כמות"
              onChange={(e) => setQuantity(l.productId, l.size, Number(e.target.value) || 1)}
            />
            <div className="cl-price">₪{l.unitPrice * l.quantity}</div>
            <button className="link" onClick={() => remove(l.productId, l.size)}>הסרה</button>
          </li>
        ))}
      </ul>
      <OrderSummary subtotal={subtotal} threshold={freeShippingThreshold} standard={standardShippingCost} />
      <Link href="/checkout" className="btn">לתשלום</Link>
    </>
  );
}
