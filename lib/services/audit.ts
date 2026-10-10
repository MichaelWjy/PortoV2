import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

type Db = Pick<typeof prisma, "auditLog">;

export type AuditEntry = {
  actorId: string;
  action: "create" | "update" | "delete" | "publish" | "unpublish" | "upload" | "replace" | "status" | "activate" | "deactivate";
  entityType: string;
  entityId?: string | null;
  /** Never include secrets, tokens or message bodies. */
  metadata?: Prisma.InputJsonValue;
};

export function recordAudit(entry: AuditEntry, db: Db = prisma) {
  return db.auditLog.create({ data: { ...entry, entityId: entry.entityId ?? null } });
}
