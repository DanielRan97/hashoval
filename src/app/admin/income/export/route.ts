import { isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { incomeWhere, resolvePeriod } from "@/lib/income";
import { PAYMENT_METHOD_LABELS } from "@/lib/payments";

export const dynamic = "force-dynamic";

// Cells starting with = + - @ would be run as formulas by Excel; a leading apostrophe keeps them text.
function cell(v: string | number | null) {
  let s = v === null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");

/** CSV of the income shown on the income page, with the same filters. Opens in Excel. */
export async function GET(req: Request) {
  if (!(await isAdmin())) return new Response("Unauthorized", { status: 401 });
  const q = new URL(req.url).searchParams;
  const period = q.get("period") ?? "month";
  const orders = await db.order.findMany({
    where: incomeWhere({
      paid: resolvePeriod(period, q.get("from") ?? undefined, q.get("to") ?? undefined),
      method: q.get("method") || undefined,
    }),
    orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
  });

  const header = ["מספר הזמנה", "תאריך תשלום", "לקוח", "אמצעי תשלום", "סכום", "משלוח", "מזהה עסקה"];
  const rows = orders.map((o) => [
    o.id,
    day(o.paidAt ?? o.createdAt),
    o.customerName,
    o.paymentMethod ? (PAYMENT_METHOD_LABELS[o.paymentMethod] ?? o.paymentMethod) : "ידני",
    o.totalAmount,
    o.shippingCost,
    o.providerTxnId,
  ]);
  // BOM so Excel reads the Hebrew as UTF-8.
  const csv = "\uFEFF" + [header, ...rows].map((r) => r.map(cell).join(",")).join("\r\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="hashoval-income-${day(new Date())}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
