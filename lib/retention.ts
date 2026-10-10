import type { PrismaClient } from "@/generated/prisma/client";

/** How long data is kept. Shared by the daily Vercel Cron job (/api/cron/prune) and `npm run prune`. */
export const RETENTION_DAYS = {
  auditLog: 90,
  analytics: 180,
  rateLimit: 1,
} as const;

const daysAgo = (now: Date, n: number) => new Date(now.getTime() - n * 86_400_000);

/** Deletes data older than its retention window. Returns how many rows of each kind were removed. */
export async function pruneOldData(db: Pick<PrismaClient, "auditLog" | "analyticsEvent" | "rateLimitBucket">, now = new Date()) {
  const [auditLogs, analyticsEvents, rateLimitBuckets] = await Promise.all([
    db.auditLog.deleteMany({ where: { createdAt: { lt: daysAgo(now, RETENTION_DAYS.auditLog) } } }),
    db.analyticsEvent.deleteMany({ where: { createdAt: { lt: daysAgo(now, RETENTION_DAYS.analytics) } } }),
    db.rateLimitBucket.deleteMany({ where: { windowStart: { lt: daysAgo(now, RETENTION_DAYS.rateLimit) } } }),
  ]);
  return { auditLogs: auditLogs.count, analyticsEvents: analyticsEvents.count, rateLimitBuckets: rateLimitBuckets.count };
}
