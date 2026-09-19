import { isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** How many paid orders are waiting to be shipped. Polled by the badge in the admin bar. */
export async function GET() {
  if (!(await isAdmin())) return Response.json({ error: "unauthorized" }, { status: 401 });
  const toShip = await db.order.count({ where: { status: "paid" } });
  return Response.json({ toShip }, { headers: { "Cache-Control": "no-store" } });
}
