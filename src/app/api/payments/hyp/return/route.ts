import { orderedParams } from "@/lib/hyp";
import { handleHypReturn, type HypOutcome } from "@/lib/hypReturn";
import { clientIp, consume } from "@/lib/rateLimit";
import { deps } from "../deps";

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
  let outcome: HypOutcome;
  try {
    outcome = await handleHypReturn(orderedParams(new URL(req.url).search), deps);
  } catch (e) {
    console.error("hyp return failed", e instanceof Error ? e.message : e);
    outcome = { kind: "unknown", reason: "error" };
  }
  // A relative address, so it works behind the hosting proxy whatever the internal host name is.
  return new Response(null, { status: 303, headers: { Location: nextPage(outcome) } });
}
