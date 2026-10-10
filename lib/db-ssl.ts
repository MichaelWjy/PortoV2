import { readFileSync } from "node:fs";

// SSL query parameters that node-pg would otherwise interpret (pg 8 treats sslmode=require as verify-full
// against the system trust store, which fails for providers with their own CA such as Supabase).
const SSL_PARAMS = ["sslmode", "sslrootcert", "sslcert", "sslkey", "sslaccept", "uselibpqcompat"];

/**
 * The database provider's root CA as PEM text, from DATABASE_SSL_CA (the certificate itself; for hosts
 * like Vercel that cannot ship a file) or DATABASE_SSL_CA_FILE (a path). Literal "\n" sequences are
 * accepted, because some dashboards store multi-line values on one line.
 */
export function caFromEnv(e: { [key: string]: unknown; DATABASE_SSL_CA?: string; DATABASE_SSL_CA_FILE?: string }): string | undefined {
  if (e.DATABASE_SSL_CA) return e.DATABASE_SSL_CA.replace(/\\n/g, "\n");
  if (e.DATABASE_SSL_CA_FILE) return readFileSync(e.DATABASE_SSL_CA_FILE, "utf8");
  return undefined;
}

/**
 * node-pg options for a connection string. With a CA (e.g. Supabase's root certificate) the TLS
 * connection is verified against that CA, hostname included; without one the URL is used as-is.
 * Shared by the app (lib/db.ts) and the CLI scripts (seed, admin, prune, media copy).
 */
export function pgOptions(url: string, ca?: string) {
  if (!ca) return { connectionString: url };
  const u = new URL(url);
  for (const p of SSL_PARAMS) u.searchParams.delete(p);
  return { connectionString: u.toString(), ssl: { ca, rejectUnauthorized: true } };
}
