import { orderedParams } from "@/lib/hyp";
import { handleHypReturn } from "@/lib/hypReturn";
import { clientIp, consume } from "@/lib/rateLimit";
import { deps, logHyp } from "../deps";

export const dynamic = "force-dynamic";

/*
 * Hyp's webhook. Give Hyp this address:
 *   https://www.hashoval.co.il/api/payments/hyp/notify
 * Hyp calls it (GET, the same parameters as the customer's return) for approved and declined payments, up to
 * a minute after the payment, and retries for about 4 hours until it gets 200. So it answers 200 once the
 * call is handled, whatever the outcome, and 503 only when trying again later could help.
 */

export async function GET(req: Request) {
  if (!(await consume(`hypnotify:${await clientIp()}`, 600, 10 * 60_000)).ok) return new Response("Too many requests", { status: 429 });
  try {
    const params = orderedParams(new URL(req.url).search);
    const outcome = await handleHypReturn(params, deps);
    logHyp("notify", params, outcome.kind === "unknown" ? `unknown (${outcome.reason})` : outcome.kind);
    if (outcome.kind === "pending" && outcome.retry) return new Response("Try again", { status: 503 });
    return new Response("OK", { status: 200 });
  } catch (e) {
    console.error("hyp notify failed", e instanceof Error ? e.message : e);
    return new Response("Error", { status: 500 });
  }
}
