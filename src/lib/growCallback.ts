import { normalizeKeys, flatten, pick, tokenFromRef, type Verified } from "./grow";

export type OrderLite = { id: number; totalAmount: number; paidAt: Date | null; providerTxnId: string | null };

export type GrowDeps = {
  verify(tx: { transactionId: string; transactionToken: string }): Promise<Verified>;
  findOrderByToken(token: string): Promise<OrderLite | null>;
  /** An order that already used this transaction id, if any. */
  findOrderByTxn(transactionId: string): Promise<{ id: number } | null>;
  confirm(orderId: number, p: { transactionId: string; transactionToken: string }): Promise<{ ok: true } | { ok: false; error: string }>;
  approve(fields: Record<string, string>): Promise<void>;
  alertOwner(subject: string, lines: string[]): Promise<void>;
};

export type CallbackResult = { status: number; body: { ok: boolean; reason?: string } };

/**
 * What Grow's notify call may carry, read tolerantly: nested JSON, or form keys like data[transactionId].
 * Nothing here is trusted yet; the transaction is checked with Grow before an order is marked paid.
 */
export function parseCallback(raw: Record<string, string>) {
  const f = normalizeKeys(flatten(raw));
  const sumText = pick(f, "data.sum", "sum");
  const sum = sumText === null ? null : Number(sumText.replace(/,/g, ""));
  return {
    flat: f,
    transactionId: pick(f, "data.transactionId", "transactionId"),
    transactionToken: pick(f, "data.transactionToken", "transactionToken"),
    orderRef: pick(f, "data.customFields.cField1", "data.cField1", "cField1"),
    orderId: pick(f, "data.customFields.cField2", "data.cField2", "cField2"),
    sum: sum !== null && Number.isFinite(sum) ? sum : null,
  };
}

const close = (a: number, b: number) => Math.abs(a - b) < 0.005;

/**
 * Handles one notify call. Rules:
 *  - the call alone proves nothing: the transaction is fetched from Grow and must be paid, for exactly the
 *    order's amount, and belong to this order;
 *  - the same transaction can pay only one order;
 *  - a repeated call for an order that is already paid is fine;
 *  - when money arrived that the shop cannot use (a second payment, or an order that expired first),
 *    the owner is told so it can be refunded.
 * 5xx answers invite Grow to try again; 200 answers are final.
 */
export async function handleGrowCallback(raw: Record<string, string>, deps: GrowDeps): Promise<CallbackResult> {
  const c = parseCallback(raw);
  if (!c.transactionId || !c.transactionToken || !c.orderRef) return { status: 400, body: { ok: false, reason: "missing fields" } };

  const token = tokenFromRef(c.orderRef);
  const order = token ? await deps.findOrderByToken(token) : null;
  if (!order) return { status: 200, body: { ok: false, reason: "unknown order" } };
  if (c.orderId !== null && Number(c.orderId) !== order.id) return { status: 200, body: { ok: false, reason: "order mismatch" } };

  const v = await deps.verify({ transactionId: c.transactionId, transactionToken: c.transactionToken });
  if (!v.ok) {
    if (v.transient) return { status: 502, body: { ok: false, reason: "could not verify, try again" } };
    if (order.paidAt) return { status: 200, body: { ok: false, reason: "not verified" } }; // already paid: nothing to warn about
    await deps.alertOwner(`תשלום ב-Grow לא אומת, הזמנה ${order.id}`, [
      `התקבלה הודעה מ-Grow על עסקה ${c.transactionId}, אבל Grow לא אישר אותה כשנשאל.`,
      "אם הלקוח באמת חויב, יש לבדוק בחשבון Grow ולסמן את ההזמנה ידנית.",
    ]);
    return { status: 200, body: { ok: false, reason: "not verified" } };
  }
  if (v.paid !== true) {
    console.warn(`grow: transaction ${c.transactionId} for order ${order.id} is not confirmed as paid (paid=${String(v.paid)})`);
    return { status: 200, body: { ok: false, reason: "not paid" } };
  }
  if (v.transactionId && v.transactionId !== c.transactionId) return { status: 200, body: { ok: false, reason: "transaction mismatch" } };
  if (v.orderRef && v.orderRef !== c.orderRef) return { status: 200, body: { ok: false, reason: "order mismatch" } };
  const sum = v.sum ?? c.sum;
  if (sum === null || !close(sum, order.totalAmount)) {
    await deps.alertOwner(`סכום לא תואם בתשלום, הזמנה ${order.id}`, [
      `הזמנה ${order.id} על ₪${order.totalAmount}, אבל העסקה ${c.transactionId} על ${sum === null ? "סכום לא ידוע" : `₪${sum}`}.`,
      "ההזמנה לא סומנה כשולמה. יש לבדוק בחשבון Grow.",
    ]);
    return { status: 200, body: { ok: false, reason: "amount mismatch" } };
  }

  if (order.paidAt) {
    if (order.providerTxnId === c.transactionId) return { status: 200, body: { ok: true } }; // a repeat
    await deps.alertOwner(`תשלום כפול, הזמנה ${order.id}`, [
      `הזמנה ${order.id} כבר שולמה (עסקה ${order.providerTxnId}), ובנוסף התקבל תשלום נוסף (עסקה ${c.transactionId}) על ₪${sum}.`,
      "יש להחזיר ללקוח את התשלום הנוסף מחשבון Grow.",
    ]);
    return { status: 200, body: { ok: false, reason: "duplicate payment" } };
  }

  const used = await deps.findOrderByTxn(c.transactionId);
  if (used && used.id !== order.id) return { status: 200, body: { ok: false, reason: "transaction already used" } };

  const done = await deps.confirm(order.id, { transactionId: c.transactionId, transactionToken: c.transactionToken });
  if (!done.ok) {
    await deps.alertOwner(`התקבל תשלום להזמנה שפגה, הזמנה ${order.id}`, [
      `הלקוח שילם ₪${sum} (עסקה ${c.transactionId}) אבל ההזמנה כבר פגה והבשמים שוחררו.`,
      "יש להחליט: לספק את ההזמנה אם יש מלאי, או להחזיר את התשלום מחשבון Grow.",
    ]);
    return { status: 200, body: { ok: false, reason: "order expired" } };
  }

  await deps.approve(c.flat); // best effort; the payment stands even if this fails
  return { status: 200, body: { ok: true } };
}
