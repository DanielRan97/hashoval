import { describe, expect, it } from "vitest";
import { orderRef } from "./grow";
import { orderedParams } from "./hyp";
import { handleHypReturn, type HypDeps } from "./hypReturn";

const TOKEN = "123e4567-e89b-12d3-a456-426614174000";
const REF = orderRef(TOKEN);
const back = (over: Record<string, string> = {}) => {
  const p = new URLSearchParams({ Id: "555", CCode: "0", Amount: "103.00", ACode: "0012345", Order: "42", Fild1: REF, Sign: "xyz" });
  for (const [k, v] of Object.entries(over)) p.set(k, v);
  return orderedParams(p.toString());
};

type Row = { id: number; token: string; totalAmount: number; paidAt: Date | null; providerTxnId: string | null };

function setup(row: Partial<Row> | null = {}, over: Partial<HypDeps> = {}) {
  const log = { confirmed: [] as number[], alerts: [] as string[], verified: 0 };
  const order: Row | null = row === null ? null : { id: 42, token: TOKEN, totalAmount: 103, paidAt: null, providerTxnId: null, ...row };
  const deps: HypDeps = {
    verify: async () => {
      log.verified += 1;
      return { ok: true, valid: true };
    },
    findOrderByToken: async (t) => (t === TOKEN ? order : null),
    findOrderByTxn: async () => null,
    confirm: async (id) => {
      log.confirmed.push(id);
      return { ok: true };
    },
    alertOwner: async (subject) => void log.alerts.push(subject),
    ...over,
  };
  return { deps, log };
}

describe("handleHypReturn", () => {
  it("marks a verified payment of the right amount as paid", async () => {
    const { deps, log } = setup();
    expect(await handleHypReturn(back(), deps)).toEqual({ kind: "paid", token: TOKEN });
    expect(log).toMatchObject({ confirmed: [42], alerts: [], verified: 1 });
  });

  it("sends a declined payment back to try again, without asking Hyp or confirming", async () => {
    const { deps, log } = setup();
    expect(await handleHypReturn(back({ CCode: "6" }), deps)).toEqual({ kind: "failed", token: TOKEN });
    expect(log).toMatchObject({ confirmed: [], verified: 0 });
  });

  it("ignores returns for an unknown order or a mismatched order number", async () => {
    expect((await handleHypReturn(back(), setup(null).deps)).kind).toBe("unknown");
    const { deps, log } = setup();
    expect(await handleHypReturn(back({ Order: "99" }), deps)).toEqual({ kind: "unknown", reason: "order mismatch" });
    expect(log.confirmed).toEqual([]);
  });

  it("does not confirm parameters Hyp does not vouch for, and tells the owner", async () => {
    const { deps, log } = setup({}, { verify: async () => ({ ok: true, valid: false }) });
    expect(await handleHypReturn(back(), deps)).toEqual({ kind: "pending", token: TOKEN });
    expect(log.confirmed).toEqual([]);
    expect(log.alerts).toHaveLength(1);
  });

  it("waits quietly when Hyp could not be reached", async () => {
    const { deps, log } = setup({}, { verify: async () => ({ ok: false, transient: true }) });
    expect(await handleHypReturn(back(), deps)).toEqual({ kind: "pending", token: TOKEN, retry: true });
    expect(log).toMatchObject({ confirmed: [], alerts: [] });
  });

  it("does not confirm a different amount, and tells the owner", async () => {
    const { deps, log } = setup();
    expect((await handleHypReturn(back({ Amount: "1.00" }), deps)).kind).toBe("pending");
    expect(log.confirmed).toEqual([]);
    expect(log.alerts).toHaveLength(1);
  });

  it("lets one transaction pay only one order", async () => {
    const { deps, log } = setup({}, { findOrderByTxn: async () => ({ id: 41 }) });
    expect((await handleHypReturn(back(), deps)).kind).toBe("unknown");
    expect(log.confirmed).toEqual([]);
  });

  it("accepts coming back again for an order already paid with this transaction", async () => {
    const { deps, log } = setup({ paidAt: new Date(), providerTxnId: "555" });
    expect(await handleHypReturn(back(), deps)).toEqual({ kind: "paid", token: TOKEN });
    expect(log).toMatchObject({ confirmed: [], alerts: [] });
  });

  it("tells the owner about a second payment for an order already paid", async () => {
    const { deps, log } = setup({ paidAt: new Date(), providerTxnId: "554" });
    expect((await handleHypReturn(back(), deps)).kind).toBe("paid");
    expect(log.alerts).toHaveLength(1);
  });

  it("tells the owner when the money came after the order expired", async () => {
    const { deps, log } = setup({}, { confirm: async () => ({ ok: false, error: "expired" }) });
    expect((await handleHypReturn(back(), deps)).kind).toBe("pending");
    expect(log.alerts).toHaveLength(1);
  });
});
