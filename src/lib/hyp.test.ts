import { describe, expect, it } from "vitest";
import { createHypProcessor, orderedParams, readHypConfig, verifyReturn } from "./hyp";

const ENV = { HYP_MASOF: "0010012345", HYP_KEY: "k1", HYP_PASSP: "p1" };
const TOKEN = "123e4567-e89b-12d3-a456-426614174000";

function withEnv<T>(env: Record<string, string>, fn: () => Promise<T>) {
  const saved = { ...process.env };
  Object.assign(process.env, env);
  return fn().finally(() => {
    for (const k of Object.keys(env)) delete process.env[k];
    Object.assign(process.env, saved);
  });
}

/** A fetch stand-in that records the requested URLs and answers each call in turn. */
function fakeFetch(...answers: (string | { status: number; text: string })[]) {
  const urls: URL[] = [];
  let i = 0;
  const impl = (async (url: string) => {
    urls.push(new URL(url));
    const a = answers[Math.min(i++, answers.length - 1)];
    const { status, text } = typeof a === "string" ? { status: 200, text: a } : a;
    return { ok: status < 400, status, text: async () => text } as Response;
  }) as unknown as typeof fetch;
  return { impl, urls };
}

describe("config", () => {
  it("needs the terminal, key and password", () => {
    expect(readHypConfig({})).toEqual({ ok: false, missing: ["HYP_MASOF", "HYP_KEY", "HYP_PASSP"] });
    const r = readHypConfig(ENV);
    expect(r.ok && r.config.baseUrl).toBe("https://pay.hyp.co.il/p/");
  });
});

describe("creating a payment", () => {
  const order = { id: 42, token: TOKEN, amount: 103, customerName: 'דני בן "דוד"', customerPhone: "+972 50 123 4567", customerEmail: "d@x.co.il" };
  const SIGNED = "action=pay&Masof=0010012345&Amount=103.00&Order=42&signature=abc123";

  it("asks Hyp to sign the request and sends the customer to the signed address unchanged", async () => {
    const { impl, urls } = fakeFetch(SIGNED);
    const r = await withEnv(ENV, () => createHypProcessor(impl).createPayment(order));
    expect(r.redirectUrl).toBe(`https://pay.hyp.co.il/p/?${SIGNED}`);
    const q = Object.fromEntries(urls[0].searchParams);
    expect(q).toMatchObject({
      action: "APISign",
      What: "SIGN",
      Masof: "0010012345",
      KEY: "k1",
      PassP: "p1",
      Sign: "True",
      Amount: "103.00",
      Coin: "1",
      Tash: "1",
      Order: "42",
      Fild1: "123e4567e89b12d3a456426614174000",
      ClientName: "דני בן",
      ClientLName: "דוד",
      cell: "0501234567",
      email: "d@x.co.il",
      PageLang: "HEB",
    });
  });

  it("gives up when Hyp does not sign", async () => {
    const { impl } = fakeFetch("CCode=902");
    await expect(withEnv(ENV, () => createHypProcessor(impl).createPayment(order))).rejects.toThrow(/902/);
  });

  it("refuses a number that is not an Israeli mobile, before calling Hyp", async () => {
    const { impl, urls } = fakeFetch(SIGNED);
    await expect(withEnv(ENV, () => createHypProcessor(impl).createPayment({ ...order, customerPhone: "031234567" }))).rejects.toThrow();
    expect(urls).toHaveLength(0);
  });

  it("explains what is missing when it is not set up", async () => {
    await expect(createHypProcessor(fakeFetch(SIGNED).impl).createPayment(order)).rejects.toThrow(/HYP_MASOF/);
  });
});

describe("verifying a return", () => {
  const back = orderedParams("?Id=555&CCode=0&Amount=103.00&ACode=0012345&Order=42&Fild1=r&Sign=xyz");

  it("keeps the returned parameters in their original order after its own", async () => {
    const { impl, urls } = fakeFetch("CCode=0");
    expect(await withEnv(ENV, () => verifyReturn(back, impl))).toEqual({ ok: true, valid: true });
    const keys = [...urls[0].searchParams.keys()];
    expect(keys.slice(0, 5)).toEqual(["action", "What", "KEY", "PassP", "Masof"]);
    expect(keys.slice(5)).toEqual(["Id", "CCode", "Amount", "ACode", "Order", "Fild1", "Sign"]);
    expect(urls[0].searchParams.get("What")).toBe("VERIFY");
  });

  it("treats any other code as not genuine", async () => {
    expect(await withEnv(ENV, () => verifyReturn(back, fakeFetch("CCode=902").impl))).toEqual({ ok: true, valid: false });
  });

  it("separates a server failure, worth retrying, from a refusal", async () => {
    expect(await withEnv(ENV, () => verifyReturn(back, fakeFetch({ status: 503, text: "" }).impl))).toEqual({ ok: false, transient: true });
    expect(await withEnv(ENV, () => verifyReturn(back, fakeFetch("garbage").impl))).toEqual({ ok: false, transient: false });
  });
});

describe("refunds", () => {
  const paid = { id: 42, amount: 103, providerTxnId: "555", providerTxnToken: null };

  it("cancels the transaction when it is still the same business day", async () => {
    const { impl, urls } = fakeFetch("TransId=555&CCode=0&ReversalStatus=777");
    expect(await withEnv(ENV, () => createHypProcessor(impl).refund(paid))).toEqual({ ok: true });
    expect(urls).toHaveLength(1);
    expect(Object.fromEntries(urls[0].searchParams)).toEqual({ action: "CancelTrans", Masof: "0010012345", PassP: "p1", TransId: "555" });
  });

  it("refunds when it is too late to cancel", async () => {
    const { impl, urls } = fakeFetch("CCode=920", "Id=556&CCode=0&ACode=1");
    expect(await withEnv(ENV, () => createHypProcessor(impl).refund(paid))).toEqual({ ok: true });
    expect(Object.fromEntries(urls[1].searchParams)).toEqual({ action: "zikoyAPI", Masof: "0010012345", PassP: "p1", TransId: "555", Amount: "103.00" });
  });

  it("reports the code when both are refused", async () => {
    const r = await withEnv(ENV, () => createHypProcessor(fakeFetch("CCode=920", "CCode=33").impl).refund(paid));
    expect(r).toEqual({ ok: false, error: "Hyp דחה את ההחזר (קוד 33)" });
  });

  it("cannot refund without the transaction number", async () => {
    expect((await withEnv(ENV, () => createHypProcessor(fakeFetch("").impl).refund({ ...paid, providerTxnId: null }))).ok).toBe(false);
  });
});
