import "server-only";
import NextAuth, { type NextAuthConfig } from "next-auth";
import { cookies } from "next/headers";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { devLoginEnabled, env, googleConfigured } from "@/lib/env";
import { authorizeDevSignIn, authorizeOAuthSignIn } from "@/lib/services/admin-users";
import { googleIdentity } from "@/lib/auth/google";
import { refreshCookieOptions, REFRESH_COOKIE, SESSION_MAX_AGE } from "@/lib/auth/session";
import { createAdminSession } from "@/lib/services/admin-sessions";
import { consumeRateLimit, RATE_LIMITS } from "@/lib/security/rate-limit";
import { clientIp, hashValue } from "@/lib/security/request";

const providers: NextAuthConfig["providers"] = [];

if (googleConfigured) {
  // Always show the account chooser, so a different signed-in Google account is never used silently.
  providers.push(Google({ clientId: env.AUTH_GOOGLE_ID, clientSecret: env.AUTH_GOOGLE_SECRET, authorization: { params: { prompt: "select_account" } } }));
}

if (devLoginEnabled) {
  // Local development and E2E tests only; env validation refuses this flag in production.
  providers.push(
    Credentials({
      id: "dev-login",
      name: "Development login",
      credentials: { email: { label: "Admin e-mail", type: "email" } },
      async authorize(raw) {
        const parsed = z.object({ email: z.email() }).safeParse(raw);
        if (!parsed.success) return null;
        if (!(await consumeRateLimit(`dev-login:${hashValue(await clientIp())}`, RATE_LIMITS.devLogin))) return null;
        const user = await authorizeDevSignIn(parsed.data.email);
        return user ? { id: user.id, email: user.email, name: user.name } : null;
      },
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  secret: env.AUTH_SECRET,
  session: { strategy: "jwt", maxAge: SESSION_MAX_AGE },
  pages: { signIn: "/admin/login", error: "/admin/login" },
  callbacks: {
    async signIn({ account, profile, user }) {
      if (account?.provider === "dev-login") return Boolean(user?.id);
      if (account?.provider !== "google") return false;

      const identity = googleIdentity(profile);
      if (!identity) return false;

      const admin = await authorizeOAuthSignIn(identity);
      if (!admin) return false;
      user.id = admin.id;
      return true;
    },
    async jwt({ token, user }) {
      if (user?.id) {
        // Sign-in: start the 1-day refresh session. proxy.ts uses it to renew the 10-minute session cookie.
        const refresh = await createAdminSession(user.id);
        (await cookies()).set(REFRESH_COOKIE, refresh.token, refreshCookieOptions(env.APP_URL.startsWith("https:")));
        token.uid = user.id;
        token.sid = refresh.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (typeof token.uid === "string") session.user.id = token.uid;
      if (typeof token.sid === "string") (session as typeof session & { sid?: string }).sid = token.sid;
      return session;
    },
  },
});
