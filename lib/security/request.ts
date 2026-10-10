import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { env } from "@/lib/env";

/**
 * Client IP as set by the trusted reverse proxy. Nginx must overwrite X-Real-IP
 * (see docs/DEPLOYMENT.md); the app port must never be reachable directly.
 */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-real-ip")?.trim() || h.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export function hashValue(...parts: string[]): string {
  return createHash("sha256").update([env.IP_HASH_SALT, ...parts].join("|")).digest("hex").slice(0, 32);
}
