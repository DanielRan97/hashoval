import { describe, expect, it } from "vitest";
import {
  approveTransaction,
  createGrowProcessor,
  flatten,
  normalizeKeys,
  orderRef,
  parseTransactionInfo,
  readGrowConfig,
  tokenFromRef,
  verifyTransaction,
} from "./grow";

const ENV = { GROW_USER_ID: "u1", GROW_PAGE_CODE: "p1", PUBLIC_SITE_URL: "https://shop.example.co.il/" };
const TOKEN = "123e4567-e89b-12d3-a456-426614174000";

function withEnv<T>(env: Record<string, string>, fn: () => Promise<T>) {
  const saved = { ...process.env };
  Object.assign(process.env, env);
  return fn().finally(() => {
    for (const k of Object.keys(env)) delete process.env[k];
    Object.assign(process.env, saved);
  });
}

/** A fetch stand-in that records requests and answers with the given JSON. */
function fakeFetch(answer: unknown, status = 200) {
  const calls: { url: string; body: FormData }[] = [];
  const impl = (async (url: string, init: { body: FormData }) => {
    calls.push({ url: String(url), body: init.body });
    return { ok: status < 400, status, text: async () => (typeof answer === "string" ? answer : JSON.stringify(answer)) } as Response;
  }) as unknown as typeof fetch;
  return { impl, calls };
}

describe("config", () => {
  it("needs the ids and an https site address", () => {
    expect(readGrowConfig({})).toEqual({ ok: false, missing: ["GROW_USER_ID", "GROW_PAGE_CODE", "PUBLIC_SITE_URL (כתובת https של האתר)"] });
    expect(readGrowConfig({ ...ENV, PUBLIC_SITE_URL: "http://x.co.il" }).ok).toBe(false);
  });
  it("uses the sandbox unless told it is live, and drops the trailing slash of the site", () => {
    const sandbox = readGrowConfig(ENV);
    expect(sandbox.ok && sandbox.config.baseUrl).toContain("sandbox");
    expect(sandbox.ok && sandbox.config.siteUrl).toBe("https://shop.example.co.il");
    const live = readGrowConfig({ ...ENV, GROW_ENV: "live" });
    expect(live.ok && live.config.live).toBe(true);
    expect(live.ok && live.config.baseUrl).not.toContain("sandbox");
  });
});

describe("order reference", () => {
  it("round-trips an order token without special characters", () => {
    expect(orderRef(TOKEN)).toBe("123e4567e89b12d3a456426614174000");
    expect(tokenFromRef(orderRef(TOKEN))).toBe(TOKEN);
    expect(tokenFromRef("nope")).toBeNull();
  });
});

describe("reading Grow's answers", () => {
  it("reads form-style and nested keys alike", () => {
    const form = normalizeKeys({ "data[transactionId]": "7", "data[customFields][cField1]": "abc" });
    const json = normalizeKeys(flatten({ data: { transactionId: 7, customFields: { cField1: "abc" } } }));
    expect(form["data.customFields.cField1"]).toBe("abc");
    expect(json["data.transactionId"]).toBe("7");
  });
  it("reads paid, amount and order reference from a transaction answer", () => {
    const v = parseTransactionInfo({ status: "1", err: "", data: { statusCode: "2", status: "שולם", sum: "103.00", transactionId: 7, customFields: { cField1: "r1" } } });
    expect(v).toEqual({ ok: true, paid: true, sum: 103, orderRef: "r1", transactionId: "7" });
  });
  it("says nothing about being paid when the answer does not", () => {
    expect(parseTransactionInfo({ status: "1", data: { sum: "5" } })).toMatchObject({ paid: null });
    expect(parseTransactionInfo({ status: "1", data: { statusCode: "1" } })).toMatchObject({ paid: false });
  });
});

describe("creating a payment", () => {
  const order = { id: 42, token: TOKEN, amount: 103, customerName: 'דני "כהן"', customerPhone: "050-123-4567", customerEmail: "d@x.co.il" };

  it("sends what Grow needs, with clean values, and returns the page address", async () => {
    const { impl, calls } = fakeFetch({ status: 1, err: "", data: { url: "https://pay.grow/abc" } });
    const r = await withEnv(ENV, () => createGrowProcessor(impl).createPayment(order));
    expect(r.redirectUrl).toBe("https://pay.grow/abc");
    const [call] = calls;
    expect(call.url).toMatch(/sandbox.*\/createPaymentProcess$/);
    const f = Object.fromEntries(call.body.entries());
    expect(f).toMatchObject({
      pageCode: "p1",
      userId: "u1",
      chargeType: "1",
      sum: "103.00",
      successUrl: `https://shop.example.co.il/thanks?t=${TOKEN}`,
      cancelUrl: `https://shop.example.co.il/pay/${TOKEN}?failed=1`,
      notifyUrl: "https://shop.example.co.il/api/payments/grow",
      "pageField[fullName]": "דני כהן",
      "pageField[phone]": "0501234567",
      "pageField[email]": "d@x.co.il",
      cField1: "123e4567e89b12d3a456426614174000",
      cField2: "42",
      saveCardToken: "0",
    });
  });

  it("gives up with a clear error when Grow refuses", async () => {
    const { impl } = fakeFetch({ status: 0, err: { message: "bad pageCode" } });
    await expect(withEnv(ENV, () => createGrowProcessor(impl).createPayment(order))).rejects.toThrow(/bad pageCode/);
  });

  it("refuses a phone number that is not a mobile one", async () => {
    const { impl, calls } = fakeFetch({});
    await expect(withEnv(ENV, () => createGrowProcessor(impl).createPayment({ ...order, customerPhone: "031234567" }))).rejects.toThrow();
    expect(calls).toHaveLength(0);
  });

  it("explains what is missing when it is not set up", async () => {
    await expect(createGrowProcessor(fakeFetch({}).impl).createPayment(order)).rejects.toThrow(/GROW_USER_ID/);
  });
});

describe("refunds", () => {
  const base = { id: 1, amount: 103, providerTxnId: "7", providerTxnToken: "tok" };
  it("sends the transaction and the amount, and reports success", async () => {
    const { impl, calls } = fakeFetch({ status: 1, err: "" });
    expect(await withEnv(ENV, () => createGrowProcessor(impl).refund(base))).toEqual({ ok: true });
    const f = Object.fromEntries(calls[0].body.entries());
    expect(calls[0].url).toMatch(/\/refundTransaction$/);
    expect(f).toMatchObject({ userId: "u1", transactionId: "7", transactionToken: "tok", refundSum: "103.00" });
  });
  it("reports Grow's reason when it refuses", async () => {
    const { impl } = fakeFetch({ status: 0, err: "no balance" });
    expect(await withEnv(ENV, () => createGrowProcessor(impl).refund(base))).toEqual({ ok: false, error: "no balance" });
  });
  it("cannot refund without both identifiers", async () => {
    const r = await withEnv(ENV, () => createGrowProcessor(fakeFetch({}).impl).refund({ ...base, providerTxnToken: null }));
    expect(r.ok).toBe(false);
  });
});

describe("verifying and approving", () => {
  it("separates a refusal from a failure worth retrying", async () => {
    expect(await withEnv(ENV, () => verifyTransaction({ transactionId: "7", transactionToken: "t" }, fakeFetch({ status: 0, err: "x" }).impl))).toEqual({ ok: false, transient: false });
    expect(await withEnv(ENV, () => verifyTransaction({ transactionId: "7", transactionToken: "t" }, fakeFetch("oops", 503).impl))).toEqual({ ok: false, transient: true });
  });
  it("asks Grow with the page code and the two identifiers", async () => {
    const { impl, calls } = fakeFetch({ status: 1, data: { statusCode: "2", sum: "10" } });
    await withEnv(ENV, () => verifyTransaction({ transactionId: "7", transactionToken: "t" }, impl));
    expect(Object.fromEntries(calls[0].body.entries())).toEqual({ pageCode: "p1", transactionId: "7", transactionToken: "t" });
  });
  it("passes the notification data back when approving, without the custom fields", async () => {
    const { impl, calls } = fakeFetch({ status: 1 });
    await withEnv(ENV, () => approveTransaction({ "data.transactionId": "7", "data.asmachta": "9", "data.customFields.cField1": "r" }, impl));
    expect(Object.fromEntries(calls[0].body.entries())).toEqual({ pageCode: "p1", transactionId: "7", asmachta: "9" });
  });
});
