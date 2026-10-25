import { orderRef } from "./grow";
import type { OrderLite } from "./growCallback";
import type { HypVerified } from "./hyp";

/** Set at checkout, read when the customer comes back from Hyp. */
export const HYP_ORDER_COOKIE = "hyp_order";

export type HypDeps = {
  verify(params: [string, string][]): Promise<HypVerified>;
  findOrderById(id: number): Promise<(OrderLite & { token: string }) | null>;
  findOrderByTxn(transactionId: string): Promise<{ id: number } | null>;
  confirm(orderId: number, transactionId: string): Promise<{ ok: true } | { ok: false; error: string }>;
  alertOwner(subject: string, lines: string[]): Promise<void>;
};

/** Where to send the customer next (or, for a server-to-server call, just the outcome). */
export type HypOutcome =
  | { kind: "paid"; token: string }
  | { kind: "failed"; token: string | null }
  | { kind: "pending"; token: string; retry?: boolean } // retry: Hyp could not be reached, asking again later may settle it
  | { kind: "unknown"; reason: string };

const close = (a: number, b: number) => Math.abs(a - b) < 0.005;

/**
 * Handles the parameters Hyp sends back after a payment (the customer's return, or a server call with
 * the same fields). Nothing is trusted before Hyp confirms the parameters (VERIFY); then the amount must
 * be the order's, the transaction may pay only one order, a repeat is fine, and money the shop cannot
 * use (a second payment, or an order that expired first) is reported to the owner.
 */
/**
 * `customerToken` is the order token the shop left in the customer's browser at checkout (see
 * HYP_ORDER_COOKIE), when the call comes from that browser; Hyp's webhook has none.
 */
export async function handleHypReturn(params: [string, string][], deps: HypDeps, customerToken?: string | null): Promise<HypOutcome> {
  const get = (k: string) => params.find(([key]) => key === k)?.[1] ?? null;
  const orderNo = Number(get("Order"));
  const order = Number.isSafeInteger(orderNo) && orderNo > 0 ? await deps.findOrderById(orderNo) : null;
  if (!order) return { kind: "unknown", reason: "unknown order" };
  // The order number alone is guessable, so before sending anyone to an order's pages (a declined payment,
  // or parameters Hyp did not vouch for) the return must also show it belongs to them: the cookie from
  // checkout, or our reference in Fild1. (Hyp has been seen to send Fild1 back as an unrelated 8-character
  // value, so the cookie is what normally does it.)
  const ref = (get("Fild1") ?? "").trim().toLowerCase();
  const refMatches = (!!customerToken && customerToken === order.token) || (ref.length === 32 && orderRef(order.token) === ref);

  const transactionId = get("Id");
  // Anything but CCode=0 is a declined or cancelled payment; the customer may try again.
  if (get("CCode") !== "0" || !transactionId) {
    if (!refMatches) return { kind: "unknown", reason: "order mismatch" };
    return order.paidAt ? { kind: "paid", token: order.token } : { kind: "failed", token: order.token };
  }

  const v = await deps.verify(params);
  if (!v.ok || !v.valid) {
    if (!refMatches) return { kind: "unknown", reason: "order mismatch" };
    if (!order.paidAt && !(v.ok === false && v.transient)) {
      await deps.alertOwner(`תשלום ב-Hyp לא אומת, הזמנה ${order.id}`, [
        `לקוח חזר מ-Hyp עם עסקה ${transactionId} להזמנה ${order.id}, אבל Hyp לא אישר את הפרטים כשנשאל.`,
        "אם הלקוח באמת חויב, יש לבדוק בחשבון Hyp ולסמן את ההזמנה ידנית.",
      ]);
    }
    if (order.paidAt) return { kind: "paid", token: order.token };
    return v.ok === false && v.transient ? { kind: "pending", token: order.token, retry: true } : { kind: "pending", token: order.token };
  }

  const amount = Number(get("Amount"));
  if (!Number.isFinite(amount) || !close(amount, order.totalAmount)) {
    await deps.alertOwner(`סכום לא תואם בתשלום, הזמנה ${order.id}`, [
      `הזמנה ${order.id} על ₪${order.totalAmount}, אבל העסקה ${transactionId} על ₪${get("Amount")}.`,
      "ההזמנה לא סומנה כשולמה. יש לבדוק בחשבון Hyp.",
    ]);
    return { kind: "pending", token: order.token };
  }

  if (order.paidAt) {
    if (order.providerTxnId !== transactionId) {
      await deps.alertOwner(`תשלום כפול, הזמנה ${order.id}`, [
        `הזמנה ${order.id} כבר שולמה (עסקה ${order.providerTxnId}), ובנוסף התקבל תשלום נוסף (עסקה ${transactionId}) על ₪${amount}.`,
        "יש להחזיר ללקוח את התשלום הנוסף מחשבון Hyp.",
      ]);
    }
    return { kind: "paid", token: order.token };
  }

  const used = await deps.findOrderByTxn(transactionId);
  if (used && used.id !== order.id) return { kind: "unknown", reason: "transaction already used" };

  const done = await deps.confirm(order.id, transactionId);
  if (!done.ok) {
    await deps.alertOwner(`התקבל תשלום להזמנה שפגה, הזמנה ${order.id}`, [
      `הלקוח שילם ₪${amount} (עסקה ${transactionId}) אבל ההזמנה כבר פגה והבשמים שוחררו.`,
      "יש להחליט: לספק את ההזמנה אם יש מלאי, או להחזיר את התשלום מחשבון Hyp.",
    ]);
    return { kind: "pending", token: order.token };
  }
  return { kind: "paid", token: order.token };
}
