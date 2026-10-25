import { orderedParams } from "@/lib/hyp";
import { cookies } from "next/headers";
import { HYP_ORDER_COOKIE, handleHypReturn, type HypOutcome } from "@/lib/hypReturn";
import { clientIp, consume } from "@/lib/rateLimit";
import { deps, logHyp } from "../deps";

export const dynamic = "force-dynamic";

/*
 * Set this address in the Hyp terminal settings as both the success page and the error page:
 *   https://www.hashoval.co.il/api/payments/hyp/return
 * The customer comes back here with the payment's parameters and is sent on to the right page.
 * Hyp's webhook (the same parameters, server to server) goes to ../notify instead.
 */

function nextPage(outcome: HypOutcome) {
  switch (outcome.kind) {
    case "paid":
    case "pending":
      return `/thanks?t=${outcome.token}`;
    case "failed":
      return outcome.token ? `/pay/${outcome.token}?failed=1` : "/cart";
    default:
      return "/cart";
  }
}

async function limited() {
  return !(await consume(`hypret:${await clientIp()}`, 120, 10 * 60_000)).ok;
}

export async function GET(req: Request) {
  if (await limited()) return new Response("Too many requests", { status: 429 });
  const params = orderedParams(new URL(req.url).search);
  let outcome: HypOutcome;
  try {
    outcome = await handleHypReturn(params, deps, (await cookies()).get(HYP_ORDER_COOKIE)?.value);
  } catch (e) {
    console.error("hyp return failed", e instanceof Error ? e.message : e);
    outcome = { kind: "unknown", reason: "error" };
  }
  logHyp("return", params, outcome.kind === "unknown" ? `unknown (${outcome.reason})` : outcome.kind);
  // A relative address, so it works behind the hosting proxy whatever the internal host name is.
  return new Response(null, { status: 303, headers: { Location: nextPage(outcome) } });
}
