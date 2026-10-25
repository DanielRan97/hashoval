import { cleanText, normalizeIsraeliMobile } from "./contact";
import { orderRef } from "./grow";
import type { PaymentProcessor } from "./payments";

/**
 * Hyp Pay (formerly YaadPay) connector. Docs: https://developers.hyp.co.il/pay
 *
 * Flow: our server asks Hyp to sign a payment request (APISign / SIGN), the customer pays on Hyp's
 * hosted page (card details never reach us), and Hyp sends the customer back to the success or error
 * page set in the terminal's settings. That address is /api/payments/hyp/return; it checks the returned
 * parameters with Hyp (APISign / VERIFY) before the order is marked paid.
 *
 * Settings (environment variables):
 *   PAYMENT_PROVIDER=hyp
 *   HYP_MASOF   terminal number (test terminals start with 00100)
 *   HYP_KEY     API key
 *   HYP_PASSP   API password
 *   HYP_BASE_URL  optional, defaults to https://pay.hyp.co.il/p/ (the same for test and live)
 */

const BASE = "https://pay.hyp.co.il/p/";

export type HypConfig = { masof: string; key: string; passp: string; baseUrl: string };

export function readHypConfig(
  env: Record<string, string | undefined> = process.env,
): { ok: true; config: HypConfig } | { ok: false; missing: string[] } {
  const masof = env.HYP_MASOF?.trim();
  const key = env.HYP_KEY?.trim();
  const passp = env.HYP_PASSP?.trim();
  const missing = [!masof && "HYP_MASOF", !key && "HYP_KEY", !passp && "HYP_PASSP"].filter(Boolean) as string[];
  if (!masof || !key || !passp) return { ok: false, missing };
  let baseUrl = env.HYP_BASE_URL?.trim() || BASE;
  if (!baseUrl.endsWith("/")) baseUrl += "/";
  return { ok: true, config: { masof, key, passp, baseUrl } };
}

function requireConfig(): HypConfig {
  const r = readHypConfig();
  if (!r.ok) throw new Error(`חסרות הגדרות Hyp: ${r.missing.join(", ")}`);
  return r.config;
}

type Fetch = typeof fetch;

/** Hyp answers in query-string form (a=1&b=2). */
async function get(cfg: HypConfig, params: [string, string][], fetchImpl: Fetch): Promise<{ ok: boolean; status: number; text: string }> {
  const query = params.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetchImpl(`${cfg.baseUrl}?${query}`, { method: "GET", signal: controller.signal, cache: "no-store" });
    return { ok: res.ok, status: res.status, text: (await res.text()).trim() };
  } finally {
    clearTimeout(timer);
  }
}

const ccode = (text: string) => new URLSearchParams(text).get("CCode");

/** The returned parameters exactly as they came, in order (VERIFY needs the original order). */
export function orderedParams(search: string): [string, string][] {
  return [...new URLSearchParams(search.replace(/^\?/, "")).entries()];
}

export type HypVerified = { ok: true; valid: boolean } | { ok: false; transient: boolean };

/** Asks Hyp whether the parameters the customer came back with are genuine: CCode=0 means they are. */
export async function verifyReturn(params: [string, string][], fetchImpl: Fetch = fetch): Promise<HypVerified> {
  const cfg = requireConfig();
  const own = new Set(["action", "What", "Masof", "KEY", "PassP"]);
  const query: [string, string][] = [
    ["action", "APISign"],
    ["What", "VERIFY"],
    ["KEY", cfg.key],
    ["PassP", cfg.passp],
    ["Masof", cfg.masof],
    ...params.filter(([k]) => !own.has(k)),
  ];
  try {
    const res = await get(cfg, query, fetchImpl);
    if (!res.ok) return { ok: false, transient: res.status >= 500 };
    const code = ccode(res.text);
    if (code === null) return { ok: false, transient: false };
    return { ok: true, valid: code === "0" };
  } catch (e) {
    console.error("hyp: verify failed", e instanceof Error ? e.message : e);
    return { ok: false, transient: true };
  }
}

/** First and last name for the payment page: the last word is the family name. */
function splitName(full: string) {
  const words = cleanText(full, 60).split(" ").filter(Boolean);
  if (words.length < 2) return { first: words[0] ?? "", last: "" };
  return { first: words.slice(0, -1).join(" "), last: words[words.length - 1] };
}

export function createHypProcessor(fetchImpl: Fetch = fetch): PaymentProcessor {
  return {
    name: "hyp",

    async createPayment(order) {
      const cfg = requireConfig();
      const cell = normalizeIsraeliMobile(order.customerPhone);
      if (!cell) throw new Error("מספר הטלפון אינו נייד ישראלי תקין");
      const name = splitName(order.customerName);
      const params: [string, string][] = [
        ["action", "APISign"],
        ["What", "SIGN"],
        ["KEY", cfg.key],
        ["PassP", cfg.passp],
        ["Masof", cfg.masof],
        ["Sign", "True"],
        ["Amount", order.amount.toFixed(2)],
        ["Coin", "1"],
        ["Tash", "1"], // one payment, no installments
        ["Order", String(order.id)],
        ["Fild1", orderRef(order.token)], // how the return finds this order
        ["Info", cleanText(`הזמנה ${order.id} hashoval`)],
        ["ClientName", name.first],
        ["ClientLName", name.last],
        ["cell", cell],
        ["PageLang", "HEB"],
        ["UTF8", "True"], // Hebrew values in, and out on return (YaadPay convention)
        ["UTF8out", "True"],
        ["MoreData", "True"],
      ];
      if (order.customerEmail) params.push(["email", order.customerEmail.trim()]);
      const res = await get(cfg, params, fetchImpl);
      // The answer is the signed request itself, with action=pay and a signature; send it on unchanged.
      if (!res.ok || !/(^|&)signature=/.test(res.text)) {
        throw new Error(`Hyp לא חתם על בקשת התשלום (קוד ${ccode(res.text) ?? res.status})`);
      }
      return { redirectUrl: `${cfg.baseUrl}?${res.text}` };
    },

    /**
     * Same business day, before the transaction goes to the card company, it is cancelled (no fee);
     * after that it is refunded. So: try to cancel, and refund if it is too late to cancel.
     */
    async refund(order) {
      const cfg = requireConfig();
      if (!order.providerTxnId) return { ok: false, error: "חסר מספר עסקה של Hyp" };
      try {
        const cancel = await get(cfg, [["action", "CancelTrans"], ["Masof", cfg.masof], ["PassP", cfg.passp], ["TransId", order.providerTxnId]], fetchImpl);
        if (cancel.ok && ccode(cancel.text) === "0") return { ok: true };
        const refund = await get(
          cfg,
          [["action", "zikoyAPI"], ["Masof", cfg.masof], ["PassP", cfg.passp], ["TransId", order.providerTxnId], ["Amount", order.amount.toFixed(2)]],
          fetchImpl,
        );
        if (refund.ok && ccode(refund.text) === "0") return { ok: true };
        return { ok: false, error: `Hyp דחה את ההחזר (קוד ${ccode(refund.text) ?? refund.status})` };
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : "שגיאה בהחזר" };
      }
    },
  };
}
