/** Retention job (run daily from cron): deletes analytics older than 180 days and stale rate-limit buckets. */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { caFromEnv, pgOptions } from "../lib/db-ssl";

const prisma = new PrismaClient({ adapter: new PrismaPg(pgOptions(process.env.DATABASE_URL!, caFromEnv(process.env))) });
const days = (n: number) => new Date(Date.now() - n * 86_400_000);

Promise.all([
  prisma.analyticsEvent.deleteMany({ where: { createdAt: { lt: days(180) } } }),
  prisma.rateLimitBucket.deleteMany({ where: { windowStart: { lt: days(1) } } }),
])
  .then(([events, buckets]) => console.log(`Pruned ${events.count} analytics events, ${buckets.count} rate-limit buckets.`))
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
