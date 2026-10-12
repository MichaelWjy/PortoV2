import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { REFRESH_MAX_AGE } from "@/lib/auth/session";

const hash = (token: string) => createHash("sha256").update(token).digest("hex");

/** Starts a refresh session at sign-in. Returns the raw token for the cookie; only its hash is stored. */
export async function createAdminSession(userId: string, now = new Date()) {
  const token = randomBytes(32).toString("base64url");
  const row = await prisma.adminSession.create({
    data: { userId, tokenHash: hash(token), expiresAt: new Date(now.getTime() + REFRESH_MAX_AGE * 1000) },
    select: { id: true },
  });
  return { id: row.id, token };
}

/**
 * Validates a refresh token: it must exist, be unexpired, and belong to a still-active admin.
 * ponytail: the token is not rotated on use (parallel requests would race); it expires 1 day after sign-in regardless.
 */
export async function redeemRefreshToken(token: string, now = new Date()) {
  if (!token || token.length > 100) return null;
  const row = await prisma.adminSession.findUnique({
    where: { tokenHash: hash(token) },
    select: { id: true, expiresAt: true, user: { select: { id: true, email: true, name: true, role: true, isActive: true } } },
  });
  if (!row) return null;
  if (row.expiresAt <= now || !row.user.isActive || row.user.role !== "ADMIN") {
    await prisma.adminSession.deleteMany({ where: { id: row.id } });
    return null;
  }
  return { sessionId: row.id, user: { id: row.user.id, email: row.user.email, name: row.user.name } };
}

/** True while the refresh session behind a session cookie still exists (not signed out, not expired). */
export async function adminSessionActive(id: string, now = new Date()) {
  const row = await prisma.adminSession.findUnique({ where: { id }, select: { expiresAt: true } });
  return Boolean(row && row.expiresAt > now);
}

export const endAdminSession = (id: string) => prisma.adminSession.deleteMany({ where: { id } });
