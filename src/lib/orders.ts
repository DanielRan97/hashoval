import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { expireUnpaidOrders } from "@/lib/orderFlow";
import { stockLevel } from "@/lib/stock";
import {
  DECANT_SIZES,
  decantPrices,
  fillPercentAfterSale,
  hasStockFor,
  sellableMl,
  shippingFor,
  type DecantSize,
} from "@/lib/pricing";

export type OrderInput = {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerAddress: string;
  items: { productId: number; size: number; quantity: number }[];
};

export type CreateOrderResult = { ok: true; orderId: number; token: string; amount: number } | { ok: false; error: string };

const MAX_QTY = 10;
/** How long an unpaid order keeps its ml reserved. */
export const HOLD_MINUTES = 15;

function validate(i: OrderInput): string | null {
  if (i.customerName.trim().length < 2) return "נא למלא שם מלא";
  if (i.customerPhone.replace(/\D/g, "").length < 9) return "נא למלא מספר טלפון תקין";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(i.customerEmail.trim())) return "נא למלא כתובת אימייל תקינה";
  if (i.customerAddress.trim().length < 6) return "נא למלא כתובת משלוח מלאה";
  if (i.items.length === 0) return "הסל ריק";
  for (const it of i.items) {
    if (!Number.isInteger(it.productId) || !DECANT_SIZES.includes(it.size as DecantSize)) return "פריט לא תקין בסל";
    if (!Number.isInteger(it.quantity) || it.quantity < 1 || it.quantity > MAX_QTY) return "כמות לא תקינה";
  }
  return null;
}

/**
 * Creates an order waiting for payment and reserves its ml right away, so nobody else can buy
 * the same stock while the customer pays. The reservation is released by expireUnpaidOrders if
 * the order is not paid in time. Prices, shipping and stock are always recomputed here from the
 * database; nothing sent by the client is trusted except product/size/quantity.
 */
export async function createOrder(input: OrderInput): Promise<CreateOrderResult> {
  const invalid = validate(input);
  if (invalid) return { ok: false, error: invalid };

  await expireUnpaidOrders(); // free ml held by abandoned checkouts before checking stock

  return db.$transaction(async (tx): Promise<CreateOrderResult> => {
    const settings = await tx.settings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
    const ids = [...new Set(input.items.map((i) => i.productId))];
    const products = await tx.product.findMany({ where: { id: { in: ids }, isActive: true } });
    const byId = new Map(products.map((p) => [p.id, p]));

    const mlByProduct = new Map<number, number>();
    const lines: { productId: number; decantSizeMl: number; unitPrice: number; quantity: number }[] = [];
    for (const it of input.items) {
      const p = byId.get(it.productId);
      if (!p) return { ok: false, error: "אחד הבשמים בסל אינו זמין יותר. נא לעדכן את הסל." };
      mlByProduct.set(p.id, (mlByProduct.get(p.id) ?? 0) + it.size * it.quantity);
      lines.push({
        productId: p.id,
        decantSizeMl: it.size,
        unitPrice: decantPrices(p, settings)[it.size as DecantSize],
        quantity: it.quantity,
      });
    }
    for (const [id, ml] of mlByProduct) {
      const p = byId.get(id)!;
      if (stockLevel(sellableMl(p, settings), settings) === "out" || !hasStockFor(p, settings, ml)) {
        return { ok: false, error: `אין כרגע מספיק מ״ל מ-${p.brand} ${p.name}. נא להקטין כמות או גודל.` };
      }
    }
    for (const [id, ml] of mlByProduct) {
      const p = byId.get(id)!;
      await tx.product.update({ where: { id }, data: { currentFillPercent: fillPercentAfterSale(p, settings, ml) } });
    }

    const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
    const shippingCost = shippingFor(subtotal, settings.freeShippingThreshold, settings.standardShippingCost);
    const token = randomUUID();
    const order = await tx.order.create({
      data: {
        customerName: input.customerName.trim(),
        customerPhone: input.customerPhone.trim(),
        customerEmail: input.customerEmail.trim(),
        customerAddress: input.customerAddress.trim(),
        shippingCost,
        totalAmount: subtotal + shippingCost,
        status: "pending_payment",
        token,
        stockDeducted: true,
        holdExpiresAt: new Date(Date.now() + HOLD_MINUTES * 60_000),
        items: { create: lines },
      },
    });
    return { ok: true, orderId: order.id, token, amount: order.totalAmount };
  });
}
