import { cleanText, normalizeIsraeliMobile } from "./contact";
import type { PaymentProcessor } from "./payments";

/**
 * Grow (formerly Meshulam) "Light API" connector: the customer pays on Grow's hosted page, Grow calls
 * our notify URL when the payment is done, and we check that call against Grow before trusting it.
 * Docs: https://developers.grow.business . All requests are server-side only and multipart form data.
 *
 * Settings (environment variables):
 *   PAYMENT_PROVIDER=grow
 *   GROW_USER_ID, GROW_PAGE_CODE   from Grow support
 *   GROW_ENV                       "live" for real money; anything else uses the sandbox
 *   GROW_BASE_URL                  optional, overrides the address of the API
 *   PUBLIC_SITE_URL                https address of this site, used for the return and notify URLs
 */

const SANDBOX_BASE = "https://sandbox.meshulam.co.il/api/light/server/1.0";
const LIVE_BASE = "https://secure.meshulam.co.il/api/light/server/1.0"; // confirm with Grow when going live

export type GrowConfig = { userId: string; pageCode: string; baseUrl: string; siteUrl: string; live: boolean };

export function readGrowConfig(
  env: Record<string, string | undefined> = process.env,
): { ok: true; config: GrowConfig } | { ok: false; missing: string[] } {
  const userId = env.GROW_USER_ID?.trim();
  const pageCode = env.GROW_PAGE_CODE?.trim();
  const siteUrl = env.PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  const missing: string[] = [];
  if (!userId) missing.push("GROW_USER_ID");
  if (!pageCode) missing.push("GROW_PAGE_CODE");
  if (!siteUrl || !/^https:\/\//i.test(siteUrl)) missing.push("PUBLIC_SITE_URL (כתובת https של האתר)");
  if (missing.length > 0 || !userId || !pageCode || !siteUrl) return { ok: false, missing };
  const live = env.GROW_ENV?.trim().toLowerCase() === "live";
  const baseUrl = env.GROW_BASE_URL?.trim().replace(/\/+$/, "") || (live ? LIVE_BASE : SANDBOX_BASE);
  return { ok: true, config: { userId, pageCode, baseUrl, siteUrl, live } };
}

type Fetch = typeof fetch;

/** The order's public token without hyphens, so it contains no special characters when sent as a custom field. */
export const orderRef = (token: string) => token.replace(/-/g, "");

/** Back from the hyphen-free form to the stored token. */
export function tokenFromRef(ref: string): string | null {
  const r = ref.trim().toLowerCase();
  if (!/^[0-9a-f]{32}$/.test(r)) return null;
  return `${r.slice(0, 8)}-${r.slice(8, 12)}-${r.slice(12, 16)}-${r.slice(16, 20)}-${r.slice(20)}`;
}

/** One level of flat keys: nested objects become "a.b.c", and form-style "a[b][c]" keys the same. */
export function flatten(input: unknown, prefix = "", out: Record<string, string> = {}): Record<string, string> {
  if (input === null || input === undefined) return out;
  if (typeof input === "object") {
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) flatten(v, prefix ? `${prefix}.${k}` : k, out);
  } else {
    out[prefix] = String(input);
  }
  return out;
}

export function normalizeKeys(flat: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(flat)) out[k.replace(/\]\[|\[/g, ".").replace(/\]/g, "")] = v;
  return out;
}

export const pick = (flat: Record<string, string>, ...keys: string[]) => {
  for (const k of keys) if (flat[k] !== undefined && flat[k] !== "") return flat[k];
  return null;
};

const toNumber = (s: string | null) => {
  if (s === null) return null;
  const n = Number(s.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
};

/** Grow answers with { status: 1 | "1", err: ..., data: {...} }. */
export function growError(json: unknown): string {
  const err = (json as { err?: unknown } | null)?.err;
  if (typeof err === "string" && err) return err;
  if (err && typeof err === "object") {
    const m = (err as { message?: unknown }).message;
    if (typeof m === "string" && m) return m;
  }
  return "תשובה לא תקינה מ-Grow";
}
const isOk = (json: unknown) => {
  const s = (json as { status?: unknown } | null)?.status;
  return s === 1 || s === "1";
};

type Posted = { httpOk: boolean; status: number; json: unknown };

async function post(cfg: GrowConfig, path: string, form: FormData, fetchImpl: Fetch): Promise<Posted> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetchImpl(`${cfg.baseUrl}/${path}`, { method: "POST", body: form, signal: controller.signal });
    const text = await res.text();
    let json: unknown = null;
    try {
      json = JSON.parse(text);
    } catch {
      /* not JSON */
    }
    return { httpOk: res.ok, status: res.status, json };
  } finally {
    clearTimeout(timer);
  }
}

function requireConfig(): GrowConfig {
  const r = readGrowConfig();
  if (!r.ok) throw new Error(`חסרות הגדרות Grow: ${r.missing.join(", ")}`);
  return r.config;
}

// ---------------------------------------------------------------------------------------------
// Checking a payment with Grow

export type Verified =
  | { ok: true; paid: boolean | null; sum: number | null; orderRef: string | null; transactionId: string | null }
  | { ok: false; transient: boolean };

/**
 * The notify call is a plain POST that anyone could send, so before an order is marked paid we ask Grow
 * about the transaction ourselves. "paid" is null when the answer does not say (the order is then not confirmed).
 */
export async function verifyTransaction(
  tx: { transactionId: string; transactionToken: string },
  fetchImpl: Fetch = fetch,
): Promise<Verified> {
  const cfg = requireConfig();
  const form = new FormData();
  form.set("pageCode", cfg.pageCode);
  form.set("transactionId", tx.transactionId);
  form.set("transactionToken", tx.transactionToken);
  let res: Posted;
  try {
    res = await post(cfg, "getTransactionInfo", form, fetchImpl);
  } catch (e) {
    console.error("grow: getTransactionInfo failed", e instanceof Error ? e.message : e);
    return { ok: false, transient: true };
  }
  if (!res.httpOk) return { ok: false, transient: res.status >= 500 };
  if (!isOk(res.json)) {
    console.error("grow: getTransactionInfo refused:", growError(res.json));
    return { ok: false, transient: false };
  }
  return parseTransactionInfo(res.json);
}

export function parseTransactionInfo(json: unknown): Verified {
  const f = normalizeKeys(flatten(json));
  const code = pick(f, "data.statusCode", "statusCode");
  const text = pick(f, "data.status", "data.statusText");
  const paid = code !== null ? code === "2" : text !== null ? /שולם|paid/i.test(text) : null;
  return {
    ok: true,
    paid,
    sum: toNumber(pick(f, "data.sum", "sum")),
    orderRef: pick(f, "data.customFields.cField1", "data.cField1", "customFields.cField1", "cField1"),
    transactionId: pick(f, "data.transactionId", "transactionId"),
  };
}

// ---------------------------------------------------------------------------------------------
// The payment processor the rest of the site uses

export function createGrowProcessor(fetchImpl: Fetch = fetch): PaymentProcessor {
  return {
    name: "grow",

    async createPayment(order) {
      const cfg = requireConfig();
      const name = cleanText(order.customerName, 60);
      const phone = normalizeIsraeliMobile(order.customerPhone);
      if (!phone) throw new Error("מספר הטלפון אינו נייד ישראלי תקין");
      const form = new FormData();
      form.set("pageCode", cfg.pageCode);
      form.set("userId", cfg.userId);
      form.set("chargeType", "1");
      form.set("sum", order.amount.toFixed(2));
      form.set("successUrl", `${cfg.siteUrl}/thanks?t=${order.token}`);
      form.set("cancelUrl", `${cfg.siteUrl}/pay/${order.token}?failed=1`);
      form.set("notifyUrl", `${cfg.siteUrl}/api/payments/grow`);
      form.set("description", cleanText(`הזמנה ${order.id} hashoval`));
      form.set("pageField[fullName]", name.split(" ").length >= 2 ? name : `${name} לקוח`);
      form.set("pageField[phone]", phone);
      if (order.customerEmail) form.set("pageField[email]", order.customerEmail.trim());
      form.set("cField1", orderRef(order.token)); // how the notify call finds this order
      form.set("cField2", String(order.id));
      form.set("saveCardToken", "0");

      const res = await post(cfg, "createPaymentProcess", form, fetchImpl);
      const f = normalizeKeys(flatten(res.json));
      const url = pick(f, "data.url", "url");
      if (!res.httpOk || !isOk(res.json) || !url) {
        throw new Error(`Grow לא יצר דף תשלום: ${growError(res.json)}`);
      }
      return { redirectUrl: url };
    },

    async refund(order) {
      const cfg = requireConfig();
      if (!order.providerTxnId || !order.providerTxnToken) return { ok: false, error: "חסר מזהה עסקה של Grow" };
      const form = new FormData();
      form.set("userId", cfg.userId);
      form.set("pageCode", cfg.pageCode);
      form.set("transactionId", order.providerTxnId);
      form.set("transactionToken", order.providerTxnToken);
      form.set("refundSum", order.amount.toFixed(2));
      try {
        const res = await post(cfg, "refundTransaction", form, fetchImpl);
        if (res.httpOk && isOk(res.json)) return { ok: true };
        return { ok: false, error: growError(res.json) };
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : "שגיאה בהחזר" };
      }
    },
  };
}

/**
 * Tells Grow our system received the notification (the docs ask for it on regular payments; the
 * transaction is processed even if this fails). The exact fields are "the data received from the
 * server update", so they are passed back as they came.
 */
export async function approveTransaction(fields: Record<string, string>, fetchImpl: Fetch = fetch): Promise<void> {
  const cfg = requireConfig();
  const form = new FormData();
  form.set("pageCode", cfg.pageCode);
  for (const [k, v] of Object.entries(fields)) {
    if (k.startsWith("data.") && !k.startsWith("data.customFields.")) form.set(k.slice(5), v);
  }
  try {
    const res = await post(cfg, "approveTransaction", form, fetchImpl);
    if (!res.httpOk || !isOk(res.json)) console.warn("grow: approveTransaction not accepted:", growError(res.json));
  } catch (e) {
    console.warn("grow: approveTransaction failed", e instanceof Error ? e.message : e);
  }
}
