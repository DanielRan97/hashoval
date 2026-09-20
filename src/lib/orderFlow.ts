import { AUTO_COMPLETE_DAYS } from "@/lib/autoComplete";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { notifyOrderPaid, notifyOrderShipped } from "@/lib/notify";
import { getPaymentProcessor, type PaymentMethod } from "@/lib/payments";
import { fillPercentAfterRestock } from "@/lib/pricing";
import { vialDelta, vialsNeeded } from "@/lib/vials";

export const STATUS_LABELS: Record<string, string> = {
  pending_payment: "ממתינה לתשלום",
  paid: "שולם, ממתינה למשלוח",
  shipped: "נשלח",
  completed: "הושלם",
  rejected: "בוטלה",
  expired: "לא שולמה, פגה",
  // orders from the earlier manual-approval flow
  pending_approval: "ממתינה לאישור (תהליך ישן)",
  approved: "מאושרת (תהליך ישן)",
};

/** Statuses the owner can cancel. */
export const CANCELLABLE = ["paid", "pending_approval", "approved"];
/** Orders that count as income (money received and not refunded). */
export const INCOME_STATUSES = ["paid", "shipped", "completed"];

export type FlowResult = { ok: true; note?: string } | { ok: false; error: string };

const STATE_ERROR: FlowResult = { ok: false, error: "סטטוס ההזמנה השתנה. נא לרענן את הדף." };

type Tx = Parameters<Parameters<typeof db.$transaction>[0]>[0];

function mlByProduct(items: { productId: number; decantSizeMl: number; quantity: number }[]) {
  const m = new Map<number, number>();
  for (const i of items) m.set(i.productId, (m.get(i.productId) ?? 0) + i.decantSizeMl * i.quantity);
  return m;
}

/** Puts an order's ml (and its empty vials) back into stock. Callers must have flipped `stockDeducted` themselves. */
async function restoreStock(tx: Tx, items: { productId: number; decantSizeMl: number; quantity: number }[]) {
  const settings = await tx.settings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
  for (const [productId, ml] of mlByProduct(items)) {
    const p = await tx.product.findUniqueOrThrow({ where: { id: productId } });
    await tx.product.update({
      where: { id: productId },
      data: { currentFillPercent: fillPercentAfterRestock(p, settings, ml) },
    });
  }
  const back = vialDelta(settings, vialsNeeded(items), 1);
  if (Object.keys(back).length > 0) await tx.settings.update({ where: { id: 1 }, data: back });
}

/**
 * Releases the ml held by orders that were never paid. Cheap, so it runs before any stock check
 * and whenever stock is displayed. Each order is expired with a conditional update, so it can
 * never race with a payment that lands at the same moment.
 */
export async function expireUnpaidOrders() {
  const stale = await db.order.findMany({
    where: { status: "pending_payment", holdExpiresAt: { lt: new Date() } },
    select: { id: true },
  });
  for (const { id } of stale) {
    await db.$transaction(async (tx) => {
      const flipped = await tx.order.updateMany({
        where: { id, status: "pending_payment", holdExpiresAt: { lt: new Date() } },
        data: { status: "expired", stockDeducted: false },
      });
      if (flipped.count === 0) return;
      const order = await tx.order.findUniqueOrThrow({ where: { id }, include: { items: true } });
      await restoreStock(tx, order.items);
    });
  }
}

/**
 * A payment succeeded (called by the test payment page now, and by the provider's webhook later).
 * pending_payment -> paid, exactly once, however many times it is called.
 */
export async function confirmPayment(
  orderId: number,
  payment: { method: PaymentMethod; provider: string; txnId: string },
): Promise<FlowResult> {
  const flipped = await db.order.updateMany({
    where: { id: orderId, status: "pending_payment" },
    data: {
      status: "paid",
      paidAt: new Date(),
      holdExpiresAt: null,
      paymentMethod: payment.method,
      paymentProvider: payment.provider,
      providerTxnId: payment.txnId,
    },
  });
  if (flipped.count === 0) {
    const o = await db.order.findUnique({ where: { id: orderId } });
    // A repeated callback for an already-paid order is fine; an expired one is not.
    if (o && o.status !== "pending_payment" && o.paidAt) return { ok: true };
    return { ok: false, error: "ההזמנה פגה לפני שהתשלום הושלם" };
  }
  await notifyOrderPaid(orderId);
  return { ok: true };
}

/**
 * Cancels an order (owner action) and refunds it automatically if it was paid.
 * `restock` puts the ml back; leave it off when the perfume is really gone.
 */
export async function cancelOrder(orderId: number, reason: string, restock: boolean): Promise<FlowResult> {
  const cleanReason = reason.trim();
  if (!cleanReason) return { ok: false, error: "נא לכתוב סיבה, היא תישלח ללקוח" };

  const previous = await db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order || !CANCELLABLE.includes(order.status)) return null;
    const flipped = await tx.order.updateMany({
      where: { id: orderId, status: order.status },
      data: { status: "rejected", rejectionReason: cleanReason, ...(restock ? { stockDeducted: false } : {}) },
    });
    if (flipped.count === 0) return null;
    if (restock && order.stockDeducted) await restoreStock(tx, order.items);
    return order;
  });
  if (!previous) return STATE_ERROR;

  let refunded = false;
  let note = "ההזמנה בוטלה.";
  if (previous.paidAt) {
    if (previous.paymentProvider) {
      const r = await getPaymentProcessor().refund({
        id: orderId,
        amount: previous.totalAmount,
        providerTxnId: previous.providerTxnId,
      });
      if (r.ok) {
        refunded = true;
        await db.order.update({ where: { id: orderId }, data: { refundedAt: new Date() } });
        note += ` הלקוח קיבל החזר אוטומטי של ₪${previous.totalAmount}.`;
      } else {
        note += ` ההחזר האוטומטי נכשל (${r.error}), יש להחזיר ללקוח ₪${previous.totalAmount} ידנית.`;
      }
    } else {
      note += ` התשלום היה ידני, יש להחזיר ללקוח ₪${previous.totalAmount} ידנית.`;
    }
  }

  if (previous.customerEmail) {
    const mail = await sendEmail(
      previous.customerEmail,
      `עדכון לגבי הזמנה מספר ${orderId}`,
      [
        `שלום ${previous.customerName},`,
        "",
        `לצערנו לא הצלחנו לספק את הזמנה מספר ${orderId}.`,
        `הסיבה: ${cleanReason}`,
        previous.paidAt
          ? refunded
            ? `התשלום (₪${previous.totalAmount}) הוחזר לאמצעי התשלום שבו שילמת. ההחזר עשוי להופיע בחשבונך תוך מספר ימי עסקים.`
            : `התשלום (₪${previous.totalAmount}) יוחזר אליך.`
          : "לא בוצע חיוב בגין ההזמנה.",
        "",
        "מתנצלים על אי הנוחות,",
        "hashoval",
      ].join("\n"),
    );
    if (!mail.sent) note += " המייל ללקוח לא נשלח (שירות המייל לא מוגדר או נכשל).";
  } else {
    note += " להזמנה אין כתובת מייל, נא ליצור קשר עם הלקוח ידנית.";
  }
  return { ok: true, note };
}

async function move(orderId: number, from: string, data: Record<string, unknown>): Promise<FlowResult> {
  const r = await db.order.updateMany({ where: { id: orderId, status: from }, data });
  return r.count === 0 ? STATE_ERROR : { ok: true };
}

/** Marks old shipped orders as completed. Cheap, so it runs whenever the admin panel loads. */
export async function completeShippedOrders() {
  await db.order.updateMany({
    where: { status: "shipped", shippedAt: { lt: new Date(Date.now() - AUTO_COMPLETE_DAYS * 86_400_000) } },
    data: { status: "completed" },
  });
}

export const markCompleted = (id: number) => move(id, "shipped", { status: "completed" });

export async function markShipped(id: number, trackingNumber: string): Promise<FlowResult> {
  const t = trackingNumber.trim();
  if (!t) return { ok: false, error: "נא להזין מספר מעקב" };
  const r = await move(id, "paid", { status: "shipped", trackingNumber: t, shippedAt: new Date() });
  if (!r.ok) return r;
  const mail = await notifyOrderShipped(id);
  return { ok: true, note: mail.sent ? "סומן כנשלח ונשלח ללקוח מייל עם מספר המעקב." : "סומן כנשלח. המייל ללקוח לא נשלח." };
}
