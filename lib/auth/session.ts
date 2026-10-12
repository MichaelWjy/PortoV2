/**
 * Admin session lifetimes.
 * - The session cookie (Auth.js JWT) is short-lived: SESSION_MAX_AGE.
 * - The refresh token (HttpOnly cookie, hashed in AdminSession) lives REFRESH_MAX_AGE from sign-in. While it is
 *   valid, proxy.ts issues a new session cookie whenever the old one has expired. Signing out deletes it.
 */
export const SESSION_MAX_AGE = 10 * 60;
export const REFRESH_MAX_AGE = 24 * 60 * 60;
export const REFRESH_COOKIE = "mw-refresh";

/** Auth.js names its cookie with the __Secure- prefix on HTTPS. */
export const sessionCookieName = (secure: boolean) => (secure ? "__Secure-authjs.session-token" : "authjs.session-token");

export const refreshCookieOptions = (secure: boolean) =>
  ({ httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: REFRESH_MAX_AGE }) as const;
