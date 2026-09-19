"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { INCOME_STATUSES } from "@/lib/orderFlow";

export type PayoutResult = { ok: boolean; msg: string } | null;

/** Marks the selected paid orders as transferred to a bank account on a date, or clears that mark. */
export async function setPayout(_: PayoutResult, form: FormData): Promise<PayoutResult> {
  await requireAdmin();
  const ids = form.getAll("orderId").map(Number).filter(Number.isInteger);
  if (ids.length === 0) return { ok: false, msg: "לא נבחרו הזמנות" };
  const where = { id: { in: ids }, status: { in: INCOME_STATUSES }, refundedAt: null };

  if (form.get("intent") === "clear") {
    const r = await db.order.updateMany({ where, data: { payoutDate: null, payoutAccount: null } });
    revalidatePath("/admin/income");
    return { ok: true, msg: `בוטל הסימון ב-${r.count} הזמנות` };
  }

  const account = String(form.get("payoutAccount") ?? "").trim();
  const date = String(form.get("payoutDate") ?? "");
  if (!account) return { ok: false, msg: "נא לרשום לאיזה חשבון בנק הועבר הכסף" };
  if (!date || isNaN(Date.parse(date))) return { ok: false, msg: "נא לבחור תאריך העברה" };
  const r = await db.order.updateMany({ where, data: { payoutDate: new Date(date), payoutAccount: account } });
  revalidatePath("/admin/income");
  return { ok: true, msg: `סומנו ${r.count} הזמנות כהועברו` };
}
