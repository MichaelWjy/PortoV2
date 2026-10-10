import "server-only";
import { prisma } from "@/lib/db";

export type RateLimitRule = { limit: number; windowMs: number };

export const RATE_LIMITS = {
  contact: { limit: 5, windowMs: 10 * 60_000 },
  analytics: { limit: 120, windowMs: 60_000 },
  upload: { limit: 30, windowMs: 10 * 60_000 },
  devLogin: { limit: 10, windowMs: 10 * 60_000 },
} satisfies Record<string, RateLimitRule>;

/** Start of the fixed window containing `now`. Pure, exported for tests. */
export function windowStart(now: number, windowMs: number): Date {
  return new Date(Math.floor(now / windowMs) * windowMs);
}

/**
 * Fixed-window counter in PostgreSQL. One atomic upsert per call, so it is safe
 * across restarts and multiple app instances without Redis.
 * Returns true when the request is allowed.
 */
export async function consumeRateLimit(key: string, rule: RateLimitRule, now = Date.now()): Promise<boolean> {
  const start = windowStart(now, rule.windowMs);
  const rows = await prisma.$queryRaw<{ count: number }[]>`
    INSERT INTO "RateLimitBucket" ("key", "count", "windowStart")
    VALUES (${key}, 1, ${start})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimitBucket"."windowStart" = ${start} THEN "RateLimitBucket"."count" + 1 ELSE 1 END,
      "windowStart" = ${start}
    RETURNING "count"`;
  return (rows[0]?.count ?? 1) <= rule.limit;
}
