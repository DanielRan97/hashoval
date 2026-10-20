import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { approveTransaction, flatten, normalizeKeys, verifyTransaction } from "@/lib/grow";
import { handleGrowCallback, type GrowDeps } from "@/lib/growCallback";
import { confirmPayment } from "@/lib/orderFlow";
import { clientIp, consume } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

/** Grow's notify call arrives as form data (or JSON); read either into flat keys. */
async function readFields(req: Request): Promise<Record<string, string>> {
  const type = req.headers.get("content-type") ?? "";
  if (type.includes("application/json")) return normalizeKeys(flatten(await req.json()));
  const form = await req.formData();
  const out: Record<string, string> = {};
  for (const [k, v] of form.entries()) if (typeof v === "string") out[k] = v;
  return normalizeKeys(out);
}

const deps: GrowDeps = {
  verify: (tx) => verifyTransaction(tx),
  findOrderByToken: (token) =>
    db.order.findUnique({ where: { token }, select: { id: true, totalAmount: true, paidAt: true, providerTxnId: true } }),
  findOrderByTxn: (transactionId) => db.order.findFirst({ where: { providerTxnId: transactionId }, select: { id: true } }),
  confirm: (orderId, p) =>
    confirmPayment(orderId, { method: "card", provider: "grow", txnId: p.transactionId, txnToken: p.transactionToken }),
  approve: (fields) => approveTransaction(fields),
  alertOwner: async (subject, lines) => {
    const owner = process.env.OWNER_EMAIL?.trim();
    if (owner) await sendEmail(owner, subject, lines.join("\n"));
    else console.error(`[OWNER_EMAIL not set] ${subject}\n${lines.join("\n")}`);
  },
};

export async function POST(req: Request) {
  // Grow's calls are rare; a flood is someone probing, and each call would otherwise cost a request to Grow.
  const limit = await consume(`growcb:${await clientIp()}`, 120, 10 * 60_000);
  if (!limit.ok) return Response.json({ ok: false, reason: "rate limited" }, { status: 429 });
  try {
    const result = await handleGrowCallback(await readFields(req), deps);
    return Response.json(result.body, { status: result.status });
  } catch (e) {
    console.error("grow callback failed", e instanceof Error ? e.message : e);
    return Response.json({ ok: false, reason: "error" }, { status: 500 });
  }
}
