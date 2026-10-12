import { NextResponse, type NextRequest } from "next/server";
import { REFRESH_COOKIE } from "@/lib/auth/session";
import { renewSessionCookie } from "@/lib/auth/refresh";

const SESSION_COOKIES = ["authjs.session-token", "__Secure-authjs.session-token"];

/**
 * 1. Per-request CSP nonce (Next.js applies it to its own scripts).
 * 2. /admin without a session cookie: renew it from the refresh token if that is still valid, otherwise redirect
 *    to sign-in. Authorization itself is still checked on the server for every admin request (lib/auth/guard.ts).
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAdmin = pathname.startsWith("/admin");
  let renewed: Awaited<ReturnType<typeof renewSessionCookie>> = null;

  if (isAdmin && pathname !== "/admin/login" && !SESSION_COOKIES.some((c) => request.cookies.has(c))) {
    const refresh = request.cookies.get(REFRESH_COOKIE)?.value;
    renewed = refresh ? await renewSessionCookie(refresh).catch(() => null) : null;
    if (!renewed) {
      const toLogin = NextResponse.redirect(new URL("/admin/login", request.url));
      if (refresh) toLogin.cookies.delete(REFRESH_COOKIE);
      return toLogin;
    }
    // This request (page render or Server Action) is signed in straight away; the browser stores the new cookie.
    request.cookies.set(renewed.name, renewed.value);
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const dev = process.env.NODE_ENV === "development";
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    // React style props need inline styles; scripts stay nonce-locked.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    // The sign-in form may redirect to Google's account chooser; browsers apply form-action to that redirect.
    "form-action 'self' https://accounts.google.com",
    "frame-ancestors 'none'",
    ...(dev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("content-security-policy", csp);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("content-security-policy", csp);
  if (renewed) response.cookies.set(renewed.name, renewed.value, renewed.options);
  if (isAdmin) {
    response.headers.set("x-robots-tag", "noindex, nofollow");
    response.headers.set("cache-control", "private, no-store");
  }
  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!api|media|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
