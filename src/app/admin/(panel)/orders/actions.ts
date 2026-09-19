"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { cancelOrder, markCompleted, markShipped, type FlowResult } from "@/lib/orderFlow";

export type OrderActionKind = "cancel" | "shipped" | "completed";

export type OrderActionResult = { ok: boolean; msg: string } | null;

/** Returns a message for the UI: an error, or a success note. */
export async function orderAction(orderId: number, kind: OrderActionKind, form: FormData): Promise<OrderActionResult> {
  await requireAdmin();
  let r: FlowResult;
  switch (kind) {
    case "completed": r = await markCompleted(orderId); break;
    case "shipped": r = await markShipped(orderId, String(form.get("trackingNumber") ?? "")); break;
    case "cancel":
      r = await cancelOrder(orderId, String(form.get("reason") ?? ""), form.get("restock") === "on");
      break;
  }
  revalidatePath("/admin", "layout");
  if (!r.ok) return { ok: false, msg: r.error };
  return r.note ? { ok: true, msg: r.note } : null;
}
