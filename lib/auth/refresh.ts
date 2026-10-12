import "server-only";
import { encode } from "next-auth/jwt";
import { env } from "@/lib/env";
import { redeemRefreshToken } from "@/lib/services/admin-sessions";
import { SESSION_MAX_AGE, sessionCookieName } from "@/lib/auth/session";

export const secureCookies = () => env.APP_URL.startsWith("https:");

/**
 * Called by proxy.ts when the 10-minute session cookie has expired: if the refresh token is still valid, mints a
 * new Auth.js session cookie with the same contents sign-in would have produced. Null means "sign in again".
 */
export async function renewSessionCookie(refreshToken: string) {
  const r = await redeemRefreshToken(refreshToken);
  if (!r) return null;
  const name = sessionCookieName(secureCookies());
  const token = { sub: r.user.id, uid: r.user.id, sid: r.sessionId, name: r.user.name, email: r.user.email };
  const value = await encode({ token, secret: env.AUTH_SECRET, salt: name, maxAge: SESSION_MAX_AGE });
  return { name, value, options: { httpOnly: true, secure: secureCookies(), sameSite: "lax", path: "/", maxAge: SESSION_MAX_AGE } as const };
}
