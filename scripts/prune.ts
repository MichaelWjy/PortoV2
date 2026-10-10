/** Retention job: same rules as the daily Vercel Cron (/api/cron/prune), for self-hosting or a manual run. */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { caFromEnv, pgOptions } from "../lib/db-ssl";
import { pruneOldData, RETENTION_DAYS } from "../lib/retention";

const prisma = new PrismaClient({ adapter: new PrismaPg(pgOptions(process.env.DATABASE_URL!, caFromEnv(process.env))) });

pruneOldData(prisma)
  .then((r) =>
    console.log(
      `Pruned ${r.auditLogs} audit-log entries (> ${RETENTION_DAYS.auditLog} days), ${r.analyticsEvents} analytics events (> ${RETENTION_DAYS.analytics} days), ${r.rateLimitBuckets} rate-limit buckets.`,
    ),
  )
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
