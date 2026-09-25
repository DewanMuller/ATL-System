import { prisma } from "@/lib/prisma";

// Vercel (and most reverse proxies) put the original client IP first in
// x-forwarded-for; x-real-ip is a fallback some setups use instead. Neither
// is guaranteed, so a request with no usable IP still gets a (shared,
// coarser) bucket rather than bypassing rate limiting entirely. Takes a
// plain `.get(name)` reader so it works with both a Request's `.headers`
// (NextAuth's authorize callback) and next/headers()'s ReadonlyHeaders
// (Server Actions) without either side needing to know about the other.
export function getClientIp(headers: { get(name: string): string | null }): string {
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return headers.get("x-real-ip") ?? "unknown";
}

// Sliding window: counts attempts recorded within the last `windowMs` for
// this key. No separate reset/cron needed — old attempts simply age out of
// every future window on their own.
export async function isRateLimited(
  key: string,
  maxAttempts: number,
  windowMs: number
): Promise<boolean> {
  const since = new Date(Date.now() - windowMs);
  const count = await prisma.rateLimitAttempt.count({
    where: { key, createdAt: { gte: since } },
  });
  return count >= maxAttempts;
}

// No windowMs used anywhere is longer than a few hours, so anything older
// than a day is dead weight — pruned opportunistically on write rather than
// needing a separate cron job.
const PRUNE_AFTER_MS = 24 * 60 * 60 * 1000;

export async function recordAttempt(key: string): Promise<void> {
  await prisma.$transaction([
    prisma.rateLimitAttempt.deleteMany({
      where: { key, createdAt: { lt: new Date(Date.now() - PRUNE_AFTER_MS) } },
    }),
    prisma.rateLimitAttempt.create({ data: { key } }),
  ]);
}
