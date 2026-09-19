"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { confirmPayment } from "@/lib/orderFlow";
import { mockPaymentsEnabled, type PaymentMethod } from "@/lib/payments";

const METHODS: PaymentMethod[] = ["card", "apple_pay", "google_pay"];

/** Test-mode payment: stands in for the provider's page and webhook. Disabled unless mock payments are on. */
export async function mockPay(token: string, method: string, outcome: "success" | "fail") {
  if (!mockPaymentsEnabled()) return;
  const order = await db.order.findUnique({ where: { token } });
  if (!order || !METHODS.includes(method as PaymentMethod)) return;
  if (outcome === "fail") redirect(`/pay/${token}?failed=1`);
  const r = await confirmPayment(order.id, { method: method as PaymentMethod, provider: "mock", txnId: `mock_${randomUUID()}` });
  if (!r.ok) redirect(`/pay/${token}`);
  redirect(`/thanks?t=${token}`);
}
