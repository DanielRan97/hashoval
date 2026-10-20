import { describe, expect, it } from "vitest";
import { orderRef } from "./grow";
import { handleGrowCallback, parseCallback, type GrowDeps, type OrderLite } from "./growCallback";

const TOKEN = "123e4567-e89b-12d3-a456-426614174000";
const REF = orderRef(TOKEN);

const call = (over: Record<string, string> = {}) => ({
  status: "1",
  err: "",
  "data[transactionId]": "7001",
  "data[transactionToken]": "tok7001",
  "data[statusCode]": "2",
  "data[sum]": "103",
  "data[customFields][cField1]": REF,
  "data[customFields][cField2]": "42",
  ...over,
});

function setup(order: Partial<OrderLite> | null = {}, over: Partial<GrowDeps> = {}) {
  const log = { confirmed: [] as number[], alerts: [] as string[], approved: 0 };
  const row: OrderLite | null = order === null ? null : { id: 42, totalAmount: 103, paidAt: null, providerTxnId: null, ...order };
  const deps: GrowDeps = {
    verify: async () => ({ ok: true, paid: true, sum: 103, orderRef: REF, transactionId: "7001" }),
    findOrderByToken: async (t) => (t === TOKEN ? row : null),
    findOrderByTxn: async () => null,
    confirm: async (id) => {
      log.confirmed.push(id);
      return { ok: true };
    },
    approve: async () => void (log.approved += 1),
    alertOwner: async (subject) => void log.alerts.push(subject),
    ...over,
  };
  return { deps, log };
}

describe("parseCallback", () => {
  it("reads form-style keys", () => {
    const c = parseCallback(call());
    expect(c).toMatchObject({ transactionId: "7001", transactionToken: "tok7001", orderRef: REF, orderId: "42", sum: 103 });
  });
});

describe("handleGrowCallback", () => {
  it("marks a verified, exact payment as paid and approves it", async () => {
    const { deps, log } = setup();
    const r = await handleGrowCallback(call(), deps);
    expect(r).toEqual({ status: 200, body: { ok: true } });
    expect(log).toMatchObject({ confirmed: [42], approved: 1, alerts: [] });
  });

  it("ignores a call that is missing what it needs", async () => {
    const { deps, log } = setup();
    expect((await handleGrowCallback({ status: "1" }, deps)).status).toBe(400);
    expect(log.confirmed).toEqual([]);
  });

  it("does not confirm an unknown order or one whose id does not match", async () => {
    expect((await handleGrowCallback(call(), setup(null).deps)).body.reason).toBe("unknown order");
    const { deps, log } = setup();
    expect((await handleGrowCallback(call({ "data[customFields][cField2]": "99" }), deps)).body.reason).toBe("order mismatch");
    expect(log.confirmed).toEqual([]);
  });

  it("asks Grow to try again when it could not check, and does not confirm", async () => {
    const { deps, log } = setup({}, { verify: async () => ({ ok: false, transient: true }) });
    expect((await handleGrowCallback(call(), deps)).status).toBe(502);
    expect(log.confirmed).toEqual([]);
  });

  it("does not confirm when Grow refuses to vouch for it, and tells the owner", async () => {
    const { deps, log } = setup({}, { verify: async () => ({ ok: false, transient: false }) });
    expect((await handleGrowCallback(call(), deps)).body.reason).toBe("not verified");
    expect(log.alerts).toHaveLength(1);
    expect(log.confirmed).toEqual([]);
  });

  it("does not warn the owner about a call that cannot be checked for an order that is already paid", async () => {
    const { deps, log } = setup({ paidAt: new Date(), providerTxnId: "7001" }, { verify: async () => ({ ok: false, transient: false }) });
    expect((await handleGrowCallback(call(), deps)).body.reason).toBe("not verified");
    expect(log.alerts).toEqual([]);
  });

  it("does not confirm when the answer does not say paid, or says not paid", async () => {
    for (const paid of [null, false]) {
      const { deps, log } = setup({}, { verify: async () => ({ ok: true, paid, sum: 103, orderRef: REF, transactionId: "7001" }) });
      expect((await handleGrowCallback(call(), deps)).body.ok).toBe(false);
      expect(log.confirmed).toEqual([]);
    }
  });

  it("does not trust the amount in the call: Grow's own figure decides", async () => {
    const { deps, log } = setup({}, { verify: async () => ({ ok: true, paid: true, sum: 5, orderRef: REF, transactionId: "7001" }) });
    const r = await handleGrowCallback(call({ "data[sum]": "103" }), deps);
    expect(r.body.reason).toBe("amount mismatch");
    expect(log.confirmed).toEqual([]);
    expect(log.alerts).toHaveLength(1);
  });

  it("rejects a transaction that belongs to another order", async () => {
    const { deps, log } = setup({}, { verify: async () => ({ ok: true, paid: true, sum: 103, orderRef: "f".repeat(32), transactionId: "7001" }) });
    expect((await handleGrowCallback(call(), deps)).body.reason).toBe("order mismatch");
    expect(log.confirmed).toEqual([]);
  });

  it("lets one transaction pay only one order", async () => {
    const { deps, log } = setup({}, { findOrderByTxn: async () => ({ id: 41 }) });
    expect((await handleGrowCallback(call(), deps)).body.reason).toBe("transaction already used");
    expect(log.confirmed).toEqual([]);
  });

  it("accepts a repeated call for an order already paid with the same transaction", async () => {
    const { deps, log } = setup({ paidAt: new Date(), providerTxnId: "7001" });
    expect((await handleGrowCallback(call(), deps)).body.ok).toBe(true);
    expect(log).toMatchObject({ confirmed: [], alerts: [] });
  });

  it("tells the owner about a second payment for an order that is already paid", async () => {
    const { deps, log } = setup({ paidAt: new Date(), providerTxnId: "6000" });
    expect((await handleGrowCallback(call(), deps)).body.reason).toBe("duplicate payment");
    expect(log.alerts).toHaveLength(1);
  });

  it("tells the owner when the money came after the order expired", async () => {
    const { deps, log } = setup({}, { confirm: async () => ({ ok: false, error: "expired" }) });
    expect((await handleGrowCallback(call(), deps)).body.reason).toBe("order expired");
    expect(log.alerts).toHaveLength(1);
    expect(log.approved).toBe(0);
  });
});
