import "server-only";
import NextAuth, { type NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { devLoginEnabled, env, googleConfigured } from "@/lib/env";
import { authorizeDevSignIn, authorizeOAuthSignIn } from "@/lib/services/admin-users";
import { googleIdentity } from "@/lib/auth/google";
import { consumeRateLimit, RATE_LIMITS } from "@/lib/security/rate-limit";
import { clientIp, hashValue } from "@/lib/security/request";

const SESSION_MAX_AGE = 8 * 60 * 60;

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
      if (user?.id) token.uid = user.id;
      return token;
    },
    async session({ session, token }) {
      if (typeof token.uid === "string") session.user.id = token.uid;
      return session;
    },
  },
});
