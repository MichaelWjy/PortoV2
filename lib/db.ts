import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { env } from "@/lib/env";
import { caFromEnv, pgOptions } from "@/lib/db-ssl";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ adapter: new PrismaPg(pgOptions(env.DATABASE_URL, caFromEnv(env))) });

if (env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
