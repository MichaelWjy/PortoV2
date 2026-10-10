import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";
import { getAdmin } from "@/lib/auth/guard";
import { devLoginEnabled, googleConfigured } from "@/lib/env";

export const metadata: Metadata = { title: "Admin sign in", robots: { index: false, follow: false } };

async function googleSignIn() {
  "use server";
  await signIn("google", { redirectTo: "/admin" });
}

async function devSignIn(fd: FormData) {
  "use server";
  if (!devLoginEnabled) redirect("/admin/login?error=Configuration");
  try {
    await signIn("dev-login", { email: String(fd.get("email") ?? ""), redirectTo: "/admin" });
  } catch (e) {
    // signIn signals success with a redirect, which must propagate; only auth failures are handled here.
    if (e instanceof AuthError) redirect("/admin/login?error=AccessDenied");
    throw e;
  }
}

const MESSAGES: Record<string, string> = {
  AccessDenied: "This account is not authorized to administer this site.",
  Configuration: "Sign-in is not configured correctly. Check the server logs.",
};

export default async function LoginPage({ searchParams }: PageProps<"/admin/login">) {
  await connection();
  if (await getAdmin()) redirect("/admin");
  const { error, signedOut } = await searchParams;
  const message = typeof error === "string" ? (MESSAGES[error] ?? "Sign-in failed. Please try again.") : null;

  return (
    <main className="adm-login">
      <div>
        <span className="mono adm-muted">MW · Admin</span>
        <h1 style={{ fontSize: 26, fontWeight: 500, letterSpacing: "-0.03em" }}>Sign in</h1>
        {signedOut && <p className="adm-ok">You have been signed out.</p>}
        {message && (
          <p role="alert" className="adm-error">
            {message}
          </p>
        )}
        {googleConfigured ? (
          <form action={googleSignIn}>
            <button className="adm-btn adm-btn-primary" type="submit" style={{ width: "100%", justifyContent: "center" }}>
              Sign in with Google
            </button>
          </form>
        ) : (
          <p className="adm-muted">Google sign-in is not configured. See docs/SECURITY.md.</p>
        )}
        <p className="adm-muted" style={{ fontSize: 12 }}>
          Access is limited to pre-approved administrators.
        </p>
        {devLoginEnabled && (
          <form action={devSignIn} style={{ display: "grid", gap: 10, borderTop: "1px solid var(--line)", paddingTop: 18 }}>
            <label htmlFor="dev-email" className="adm-muted" style={{ fontSize: 12 }}>
              Development login (disabled in production)
            </label>
            <input id="dev-email" name="email" type="email" required className="adm-input" placeholder="admin e-mail" autoComplete="email" />
            <button className="adm-btn" type="submit">
              Sign in (dev)
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
