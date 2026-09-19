import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";

type FullOrder = NonNullable<Awaited<ReturnType<typeof loadOrder>>>;

function loadOrder(orderId: number) {
  return db.order.findUnique({ where: { id: orderId }, include: { items: { include: { product: true } } } });
}

function itemLines(o: FullOrder) {
  return o.items.map(
    (i) => `• ${i.product.brand} ${i.product.name} — ${i.decantSizeMl} מ״ל × ${i.quantity} — ₪${i.unitPrice * i.quantity}`,
  );
}

function summary(o: FullOrder) {
  return [
    ...itemLines(o),
    `משלוח: ${o.shippingCost === 0 ? "חינם" : `₪${o.shippingCost}`}`,
    `סה״כ: ₪${o.totalAmount}`,
  ].join("\n");
}

/** Emails are best-effort: a failed email never blocks or undoes an order action. */
async function toCustomer(o: FullOrder, subject: string, body: string[]) {
  if (!o.customerEmail) return { sent: false };
  return sendEmail(o.customerEmail, subject, [`שלום ${o.customerName},`, "", ...body, "", "hashoval"].join("\n"));
}

/** Payment received: confirmation to the customer and a heads-up to the owner. */
export async function notifyOrderPaid(orderId: number) {
  const o = await loadOrder(orderId);
  if (!o) return;
  await toCustomer(o, `התשלום התקבל, הזמנה מספר ${o.id}`, [
    "תודה! התשלום התקבל וההזמנה בטיפול.",
    "נעדכן אותך במייל כשההזמנה תישלח.",
    "",
    summary(o),
  ]);
  const owner = process.env.OWNER_EMAIL?.trim();
  if (owner) {
    await sendEmail(
      owner,
      `הזמנה חדשה ששולמה, מספר ${o.id}, ₪${o.totalAmount}`,
      [`${o.customerName} · ${o.customerPhone}`, o.customerAddress, "", summary(o), "", "לטיפול: לוח הבקרה ← הזמנות"].join("\n"),
    );
  } else {
    console.log(`[OWNER_EMAIL not set] paid order ${o.id} was not announced by email`);
  }
}

export async function notifyOrderShipped(orderId: number) {
  const o = await loadOrder(orderId);
  if (!o) return { sent: false };
  return toCustomer(o, `הזמנה מספר ${o.id} נשלחה`, [
    "ההזמנה שלך נשלחה אליך.",
    o.trackingNumber ? `מספר מעקב: ${o.trackingNumber}` : "",
  ].filter(Boolean));
}
