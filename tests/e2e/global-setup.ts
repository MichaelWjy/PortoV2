import { execSync } from "node:child_process";
import { Client } from "pg";

/**
 * Prepares the dedicated porto_e2e database: apply migrations (non-destructive), empty its tables,
 * seed, and allow-list the test admin. Refuses to touch any database not named porto_e2e.
 */
export default async function globalSetup() {
  const url = process.env.E2E_DATABASE_URL ?? "postgresql://porto:porto_dev_password@localhost:5433/porto_e2e?schema=public";
  if (!/\/porto_e2e(\?|$)/.test(url)) throw new Error("E2E_DATABASE_URL must point at a porto_e2e database");
  const env = { ...process.env, DATABASE_URL: url, NODE_ENV: "development" as const };
  const run = (cmd: string) => execSync(cmd, { env, stdio: "inherit" });

  run("npx prisma migrate deploy");
  const db = new Client({ connectionString: url });
  await db.connect();
  const { rows } = await db.query<{ tablename: string }>("SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'");
  await db.query(`TRUNCATE ${rows.map((r) => `"${r.tablename}"`).join(", ")} CASCADE`);
  await db.end();
  run("npx tsx prisma/seed.ts");
  run("npx tsx scripts/admin.ts add e2e-admin@example.test E2E");
}
