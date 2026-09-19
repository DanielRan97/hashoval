import { headers } from "next/headers";
import { db } from "@/lib/db";

/**
 * Abuse limiting backed by the database, so it holds across restarts and several server
 * instances. Keys look like "login:<ip>". The client IP comes from the proxy's
 * X-Forwarded-For header; that is only trustworthy when the site sits behind a proxy
 * that sets it (Vercel, Cloudflare, nginx...), which is how it will run in production.
 */
export async function clientIp() {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || h.get("x-real-ip") || "local";
}

/** Seconds until the oldest counted hit leaves the window, or 0 if under the limit. */
export async function retryAfterSeconds(key: string, limit: number, windowMs: number) {
  const since = new Date(Date.now() - windowMs);
  const hits = await db.rateLimitHit.findMany({
    where: { key, createdAt: { gte: since } },
    orderBy: { createdAt: "asc" },
    take: limit,
    select: { createdAt: true },
  });
  if (hits.length < limit) return 0;
  return Math.max(1, Math.ceil((hits[0].createdAt.getTime() + windowMs - Date.now()) / 1000));
}

export async function recordHit(key: string) {
  await db.rateLimitHit.create({ data: { key } });
  // Housekeeping: about 1% of writes also drop hits older than two days.
  if (Math.random() < 0.01) await db.rateLimitHit.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 2 * 86_400_000) } } });
}

/** Counts this request and reports whether it is allowed. */
export async function consume(key: string, limit: number, windowMs: number) {
  const wait = await retryAfterSeconds(key, limit, windowMs);
  if (wait > 0) return { ok: false as const, retryAfter: wait };
  await recordHit(key);
  return { ok: true as const };
}

export const minutes = (n: number) => Math.ceil(n / 60);
