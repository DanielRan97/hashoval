import { isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { clientIp, consume } from "@/lib/rateLimit";

/** Counts one storefront view of a product. The client calls this once per browser session. */
export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const productId = Number((await params).id);
  if (!Number.isInteger(productId) || (await isAdmin())) return new Response(null, { status: 204 });
  if (!(await consume(`view:${await clientIp()}`, 60, 10 * 60_000)).ok) return new Response(null, { status: 204 });
  await db.product.updateMany({ where: { id: productId, isActive: true }, data: { views: { increment: 1 } } });
  return new Response(null, { status: 204 });
}
