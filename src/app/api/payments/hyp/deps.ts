import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { verifyReturn } from "@/lib/hyp";
import type { HypDeps } from "@/lib/hypReturn";
import { confirmPayment } from "@/lib/orderFlow";

/** What the customer return and Hyp's webhook share: the database, Hyp's VERIFY, and the owner's mailbox. */
export const deps: HypDeps = {
  verify: (params) => verifyReturn(params),
  findOrderByToken: async (token) => {
    const o = await db.order.findUnique({ where: { token }, select: { id: true, token: true, totalAmount: true, paidAt: true, providerTxnId: true } });
    return o && o.token ? { ...o, token: o.token } : null;
  },
  findOrderByTxn: (transactionId) => db.order.findFirst({ where: { providerTxnId: transactionId, paymentProvider: "hyp" }, select: { id: true } }),
  confirm: (orderId, transactionId) => confirmPayment(orderId, { method: "card", provider: "hyp", txnId: transactionId }),
  alertOwner: async (subject, lines) => {
    const owner = process.env.OWNER_EMAIL?.trim();
    if (owner) await sendEmail(owner, subject, lines.join("\n"));
    else console.error(`[OWNER_EMAIL not set] ${subject}\n${lines.join("\n")}`);
  },
};
