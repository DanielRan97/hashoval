/**
 * Payment adapter. Everything the site needs from a payment provider goes through this
 * interface: start a payment (the customer pays on the provider's hosted page, where card,
 * Apple Pay and Google Pay are offered) and refund it. When a real provider is connected
 * (PayPlus / Grow / Cardcom / Tranzila), add a class implementing PaymentProcessor and return
 * it from getPaymentProcessor; the provider's webhook then calls confirmPayment in orderFlow.ts,
 * exactly like the test payment page does.
 */
import { createGrowProcessor } from "./grow";
import { createHypProcessor } from "./hyp";

export type PaymentMethod = "card" | "apple_pay" | "google_pay";

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  card: "כרטיס אשראי",
  apple_pay: "Apple Pay",
  google_pay: "Google Pay",
};

export type PaymentOrder = {
  id: number;
  token: string;
  amount: number;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
};

export interface PaymentProcessor {
  name: string;
  /** Starts a payment. The customer is sent to `redirectUrl` to pay. */
  createPayment(order: PaymentOrder): Promise<{ redirectUrl: string }>;
  refund(order: {
    id: number;
    amount: number;
    providerTxnId: string | null;
    providerTxnToken: string | null;
  }): Promise<{ ok: true } | { ok: false; error: string }>;
}

/** Test mode: a fake payment page on this site. Never moves real money. */
export const mockProcessor: PaymentProcessor = {
  name: "mock",
  async createPayment(order) {
    return { redirectUrl: `/pay/${order.token}` };
  },
  async refund() {
    return { ok: true };
  },
};

/** Which provider is configured: "mock" (test), "hyp", "grow", or "" when none. The mock is the default in development only. */
export function paymentProvider() {
  return (process.env.PAYMENT_PROVIDER ?? (process.env.NODE_ENV === "production" ? "" : "mock")).trim().toLowerCase();
}

export function mockPaymentsEnabled() {
  return paymentProvider() === "mock";
}

export function getPaymentProcessor(): PaymentProcessor {
  const provider = paymentProvider();
  if (provider === "mock") return mockProcessor;
  if (provider === "grow") return createGrowProcessor();
  if (provider === "hyp") return createHypProcessor();
  throw new Error("No payment provider is configured (set PAYMENT_PROVIDER to mock, hyp or grow)");
}
