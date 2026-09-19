"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useCart, useCartCleanup } from "@/lib/cart";
import type { StoreProduct } from "@/lib/catalog";
import { OrderSummary } from "../cart/CartView";
import { RemovedNotice } from "../cart/RemovedNotice";
import { placeOrder } from "./actions";

export function CheckoutForm({
  catalog,
  freeShippingThreshold,
  standardShippingCost,
}: {
  catalog: StoreProduct[];
  freeShippingThreshold: number;
  standardShippingCost: number;
}) {
  const { ready } = useCart();
  const { lines, removed, subtotal } = useCartCleanup(catalog);
  const [state, action, pending] = useActionState(placeOrder, null);
  const v = state?.values;

  if (!ready) return null;
  if (lines.length === 0) {
    return (
      <>
        <RemovedNotice removed={removed} />
        <p className="muted">הסל ריק.</p>
        <Link href="/cart" className="btn">לסל</Link>
      </>
    );
  }
  const items = JSON.stringify(lines.map((l) => ({ productId: l.productId, size: l.size, quantity: l.quantity })));
  return (
    <>
    <RemovedNotice removed={removed} />
    <div className="checkout">
      <form action={action} className="form">
        <input type="hidden" name="items" value={items} />
        <div className="hp" aria-hidden="true">
          {/* Honeypot. Its name must not look like a real field ("company", "website"...): browsers autofill those,
              and that turned every first order attempt into a rejected one. */}
          <label>אל תמלאו שדה זה<input name="hp_check_7f3" tabIndex={-1} autoComplete="off" data-lpignore="true" data-1p-ignore="true" data-form-type="other" /></label>
        </div>
        <label>שם מלא<input name="customerName" autoComplete="name" defaultValue={v?.customerName} required /></label>
        <label>טלפון<input name="customerPhone" type="tel" autoComplete="tel" defaultValue={v?.customerPhone} required /></label>
        <label>אימייל<input name="customerEmail" type="email" autoComplete="email" defaultValue={v?.customerEmail} required /></label>
        <label>כתובת למשלוח<textarea name="customerAddress" rows={3} autoComplete="street-address" defaultValue={v?.customerAddress} required /></label>
        <label className="check">
          <input type="checkbox" name="acceptTerms" required />
          <span>קראתי ואני מסכים/ה ל<Link href="/terms" target="_blank">תקנון</Link> ול<Link href="/privacy" target="_blank">מדיניות הפרטיות</Link></span>
        </label>
        {state && <p className="error" role="alert">{state.error}</p>}
        <button className="btn" disabled={pending}>{pending ? "שולח…" : "המשך לתשלום"}</button>
      </form>
      <aside>
        <h2>סיכום</h2>
        <ul className="plain">
          {lines.map((l) => (
            <li key={`${l.productId}-${l.size}`} className="cart-line summary-line">
              <div className="cl-name">
                {l.brand} · {l.name}
                <div className="muted">{l.size} מ״ל · כמות {l.quantity}</div>
              </div>
              <div className="cl-price">₪{l.unitPrice * l.quantity}</div>
            </li>
          ))}
        </ul>
        <OrderSummary subtotal={subtotal} threshold={freeShippingThreshold} standard={standardShippingCost} />
        <p className="muted">התשלום מתבצע בשלב הבא, באשראי, Apple Pay או Google Pay. הבשמים נשמרים לך במהלך התשלום.</p>
      </aside>
    </div>
    </>
  );
}
