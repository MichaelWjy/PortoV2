import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ unstable_cache: <T>(fn: T) => fn, revalidateTag: vi.fn(), revalidatePath: vi.fn() }));

import { decode } from "next-auth/jwt";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { REFRESH_MAX_AGE, SESSION_MAX_AGE, sessionCookieName } from "@/lib/auth/session";
import { adminSessionActive, createAdminSession, endAdminSession, redeemRefreshToken } from "@/lib/services/admin-sessions";
import { renewSessionCookie } from "@/lib/auth/refresh";
import { pruneOldData } from "@/lib/retention";
import { createAdmin, resetDatabase } from "../support/db";

let adminId: string;

beforeEach(async () => {
  await resetDatabase();
  adminId = (await createAdmin()).id;
});

describe("admin refresh sessions", () => {
  it("uses a 10-minute session cookie and a 1-day refresh token", () => {
    expect(SESSION_MAX_AGE).toBe(600);
    expect(REFRESH_MAX_AGE).toBe(86_400);
  });

  it("stores only a hash of the refresh token and redeems it while valid", async () => {
    const { id, token } = await createAdminSession(adminId);
    const row = await prisma.adminSession.findUniqueOrThrow({ where: { id } });
    expect(row.tokenHash).not.toContain(token);
    expect((await redeemRefreshToken(token))?.user.id).toBe(adminId);
    expect(await redeemRefreshToken("not-a-real-token")).toBeNull();
  });

  it("refuses and deletes a refresh token after its day is up", async () => {
    const start = new Date("2026-10-12T00:00:00Z");
    const { id, token } = await createAdminSession(adminId, start);
    expect(await redeemRefreshToken(token, new Date(start.getTime() + (REFRESH_MAX_AGE - 1) * 1000))).not.toBeNull();
    expect(await redeemRefreshToken(token, new Date(start.getTime() + REFRESH_MAX_AGE * 1000))).toBeNull();
    expect(await prisma.adminSession.count({ where: { id } })).toBe(0);
  });

  it("refuses a deactivated admin", async () => {
    const { token } = await createAdminSession(adminId);
    await prisma.user.update({ where: { id: adminId }, data: { isActive: false } });
    expect(await redeemRefreshToken(token)).toBeNull();
  });

  it("signing out ends the session for every copy of the cookie", async () => {
    const { id, token } = await createAdminSession(adminId);
    expect(await adminSessionActive(id)).toBe(true);
    await endAdminSession(id);
    expect(await adminSessionActive(id)).toBe(false);
    expect(await redeemRefreshToken(token)).toBeNull();
  });

  it("mints a session cookie Auth.js can read, tied to the refresh session", async () => {
    const { id, token } = await createAdminSession(adminId);
    const renewed = await renewSessionCookie(token);
    expect(renewed?.name).toBe(sessionCookieName(env.APP_URL.startsWith("https:")));
    expect(renewed?.options.maxAge).toBe(SESSION_MAX_AGE);
    const jwt = await decode({ token: renewed!.value, secret: env.AUTH_SECRET, salt: renewed!.name });
    expect(jwt).toMatchObject({ uid: adminId, sid: id });
  });

  it("the daily cleanup removes expired sessions", async () => {
    await createAdminSession(adminId, new Date(Date.now() - 2 * REFRESH_MAX_AGE * 1000));
    await createAdminSession(adminId);
    expect((await pruneOldData(prisma)).adminSessions).toBe(1);
    expect(await prisma.adminSession.count()).toBe(1);
  });
});
