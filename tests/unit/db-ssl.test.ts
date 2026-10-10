import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { caFromEnv, pgOptions } from "@/lib/db-ssl";

const URL_WITH_SSL = "postgresql://u:p@db.example.test:5432/postgres?sslmode=require&schema=public";

describe("database TLS options", () => {
  it("passes the URL through untouched without a CA file (local Docker database)", () => {
    expect(pgOptions(URL_WITH_SSL)).toEqual({ connectionString: URL_WITH_SSL });
  });

  it("verifies against the provider CA and drops URL ssl params that would override it", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "ca-"));
    const ca = path.join(dir, "ca.crt");
    writeFileSync(ca, "-----BEGIN CERTIFICATE-----\nTEST\n-----END CERTIFICATE-----\n");
    const opts = pgOptions(URL_WITH_SSL, caFromEnv({ DATABASE_SSL_CA_FILE: ca }));
    expect(opts.connectionString).toBe("postgresql://u:p@db.example.test:5432/postgres?schema=public");
    expect(opts.ssl).toEqual({ ca: expect.stringContaining("BEGIN CERTIFICATE"), rejectUnauthorized: true });
  });

  it("accepts the certificate text directly, including one-line escaped newlines", () => {
    const lines = ["-----BEGIN CERTIFICATE-----", "AB", "-----END CERTIFICATE-----"];
    const oneLine = lines.join("\\n"); // backslash + n, as some dashboards store it
    const expected = lines.join("\n");
    expect(caFromEnv({ DATABASE_SSL_CA: oneLine })).toBe(expected);
    expect(caFromEnv({ DATABASE_SSL_CA: expected })).toBe(expected);
    expect(caFromEnv({})).toBeUndefined();
  });
});
