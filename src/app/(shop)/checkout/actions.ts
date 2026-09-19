"use server";

import { redirect } from "next/navigation";
import { createOrder } from "@/lib/orders";
import { getPaymentProcessor } from "@/lib/payments";
import { clientIp, minutes, recordHit, retryAfterSeconds } from "@/lib/rateLimit";

/** Returned on failure together with what was typed, because React clears the form after an action. */
export type CheckoutState = {
  error: string;
  values: { customerName: string; customerPhone: string; customerEmail: string; customerAddress: string };
} | null;

async function submit(form: FormData): Promise<string | null> {
  let items;
  try {
    items = JSON.parse(String(form.get("items") ?? "[]"));
    if (!Array.isArray(items)) throw new Error();
  } catch {
    return "הסל לא תקין";
  }
  // Honeypot: a field real visitors never see. Bots fill it in.
  if (String(form.get("hp_check_7f3") ?? "").trim() !== "") return "לא ניתן לשלוח את ההזמנה";
  if (form.get("acceptTerms") !== "on") return "יש לאשר את התקנון כדי להמשיך";

  // Each unpaid order holds stock, so cap how many one visitor can open. Only orders that were
  // really created count, so typos in the form never use up the allowance.
  const ip = await clientIp();
  const burst = await retryAfterSeconds(`order:${ip}`, 3, 15 * 60_000);
  if (burst > 0) return `יותר מדי הזמנות בזמן קצר. נסו שוב בעוד ${minutes(burst)} דקות.`;
  if ((await retryAfterSeconds(`order-day:${ip}`, 10, 24 * 60 * 60_000)) > 0) return "הגעתם למגבלת ההזמנות היומית. נסו שוב מחר.";

  const str = (k: string) => String(form.get(k) ?? "");
  const result = await createOrder({
    customerName: str("customerName"),
    customerPhone: str("customerPhone"),
    customerEmail: str("customerEmail"),
    customerAddress: str("customerAddress"),
    items: items.map((i: { productId: unknown; size: unknown; quantity: unknown }) => ({
      productId: Number(i.productId),
      size: Number(i.size),
      quantity: Number(i.quantity),
    })),
  });
  if (!result.ok) return result.error;
  await recordHit(`order:${ip}`);
  await recordHit(`order-day:${ip}`);

  let redirectUrl: string;
  try {
    ({ redirectUrl } = await getPaymentProcessor().createPayment({
      id: result.orderId,
      token: result.token,
      amount: result.amount,
      customerName: str("customerName"),
      customerEmail: str("customerEmail"),
    }));
  } catch (e) {
    console.error("payment start failed", e);
    return "לא הצלחנו להתחיל את התשלום. נסו שוב בעוד רגע.";
  }
  redirect(redirectUrl);
}

export async function placeOrder(_: CheckoutState, form: FormData): Promise<CheckoutState> {
  const error = await submit(form);
  if (!error) return null;
  const str = (k: string) => String(form.get(k) ?? "");
  return {
    error,
    values: {
      customerName: str("customerName"),
      customerPhone: str("customerPhone"),
      customerEmail: str("customerEmail"),
      customerAddress: str("customerAddress"),
    },
  };
}
