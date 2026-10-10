import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.fn();
vi.mock("@/lib/auth", () => ({ auth: () => auth(), signOut: vi.fn() }));
vi.mock("next/cache", () => ({ unstable_cache: <T>(fn: T) => fn, revalidateTag: vi.fn(), revalidatePath: vi.fn() }));

import { prisma } from "@/lib/db";
import { pruneOldData, RETENTION_DAYS } from "@/lib/retention";
import { deleteAllMessages } from "@/app/admin/(panel)/actions";
import { GET as cronPrune } from "@/app/api/cron/prune/route";
import { createAdmin, resetDatabase } from "../support/db";

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);
let actor: string;

beforeEach(async () => {
  await resetDatabase();
  actor = (await createAdmin()).id;
  auth.mockReset();
});

describe("retention", () => {
  it("deletes audit-log entries older than 90 days and keeps newer ones", async () => {
    expect(RETENTION_DAYS.auditLog).toBe(90);
    await prisma.auditLog.createMany({
      data: [
        { actorId: actor, action: "update", entityType: "Project", createdAt: daysAgo(91) },
        { actorId: actor, action: "update", entityType: "Project", createdAt: daysAgo(89) },
        { actorId: actor, action: "update", entityType: "Project", createdAt: daysAgo(1) },
      ],
    });
    const removed = await pruneOldData(prisma);
    expect(removed.auditLogs).toBe(1);
    expect(await prisma.auditLog.count()).toBe(2);
  });

  it("refuses the cron endpoint without the shared secret", async () => {
    const res = await cronPrune(new Request("http://localhost/api/cron/prune", { headers: { authorization: "Bearer wrong-secret-wrong-secret" } }));
    expect(res.status).toBe(401);
  });
});

describe("delete all messages", () => {
  it("requires an admin", async () => {
    auth.mockResolvedValue(null);
    await prisma.contactMessage.create({ data: { name: "A", email: "a@example.test", message: "Hello there!" } });
    await expect(deleteAllMessages()).rejects.toSatisfy((e: unknown) => String((e as { digest?: string }).digest ?? "").includes("/admin/login"));
    expect(await prisma.contactMessage.count()).toBe(1);
  });

  it("deletes every message, archived included, and records it in the audit log", async () => {
    auth.mockResolvedValue({ user: { id: actor } });
    await prisma.contactMessage.createMany({
      data: [
        { name: "A", email: "a@example.test", message: "Hello there!" },
        { name: "B", email: "b@example.test", message: "Hello again!", status: "ARCHIVED" },
      ],
    });
    expect((await deleteAllMessages()).ok).toBe(true);
    expect(await prisma.contactMessage.count()).toBe(0);
    const log = await prisma.auditLog.findFirst({ where: { entityType: "ContactMessage" } });
    expect(log?.metadata).toEqual({ scope: "all", count: 2 });
  });
});
