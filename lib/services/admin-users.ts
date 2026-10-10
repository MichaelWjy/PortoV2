import "server-only";
import { prisma } from "@/lib/db";

import type { OAuthIdentity } from "@/lib/auth/google";

/**
 * Application authorization for an identity Google has already authenticated (verified e-mail).
 * Only users pre-registered in the User table (via `npm run admin -- add`) may sign in.
 * The first sign-in binds the account to the provider's immutable account ID (`sub`); later sign-ins
 * must present that same ID, so a recycled or re-assigned e-mail address cannot take over the account.
 */
export async function authorizeOAuthSignIn(identity: OAuthIdentity) {
  const email = identity.email.trim().toLowerCase();
  const bySubject = await prisma.user.findUnique({ where: { providerSubject: identity.subject } });
  const user = bySubject ?? (await prisma.user.findUnique({ where: { email } }));

  if (!user || !user.isActive || user.role !== "ADMIN") return null;
  if (user.providerSubject && user.providerSubject !== identity.subject) return null;

  return prisma.user.update({
    where: { id: user.id },
    data: { providerSubject: identity.subject, lastLoginAt: new Date(), name: user.name ?? identity.name ?? null },
  });
}

/** Development-only login (see lib/auth). Still requires an active admin row. */
export async function authorizeDevSignIn(email: string) {
  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!user || !user.isActive || user.role !== "ADMIN") return null;
  return prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
}

export async function findActiveAdmin(id: string) {
  const user = await prisma.user.findUnique({ where: { id }, select: { id: true, email: true, name: true, role: true, isActive: true } });
  return user && user.isActive && user.role === "ADMIN" ? user : null;
}
