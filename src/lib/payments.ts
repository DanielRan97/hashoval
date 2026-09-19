/**
 * Payment adapter. Everything the site needs from a payment provider goes through this
 * interface: start a payment (the customer pays on the provider's hosted page, where card,
 * Apple Pay and Google Pay are offered) and refund it. When a real provider is connected
 * (PayPlus / Grow / Cardcom / Tranzila), add a class implementing PaymentProcessor and return
 * it from getPaymentProcessor; the provider's webhook then calls confirmPayment in orderFlow.ts,
 * exactly like the test payment page does.
 */
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
  customerEmail: string | null;
};

export interface PaymentProcessor {
  name: string;
  /** Starts a payment. The customer is sent to `redirectUrl` to pay. */
  createPayment(order: PaymentOrder): Promise<{ redirectUrl: string }>;
  refund(order: { id: number; amount: number; providerTxnId: string | null }): Promise<{ ok: true } | { ok: false; error: string }>;
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

/** The mock is on by default in development, and in production only if PAYMENT_PROVIDER=mock. */
export function mockPaymentsEnabled() {
  const provider = process.env.PAYMENT_PROVIDER ?? (process.env.NODE_ENV === "production" ? "" : "mock");
  return provider === "mock";
}

export function getPaymentProcessor(): PaymentProcessor {
  if (mockPaymentsEnabled()) return mockProcessor;
  throw new Error("No payment provider is configured (set PAYMENT_PROVIDER and add its adapter in payments.ts)");
}
