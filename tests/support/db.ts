import { prisma } from "@/lib/db";

/** Empties every table. Refuses to run unless the database name ends in _test. */
export async function resetDatabase() {
  const url = process.env.DATABASE_URL ?? "";
  if (!/\/[\w-]*_test(\?|$)/.test(url)) throw new Error("Refusing to reset a database that is not a *_test database");
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  await prisma.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(", ")} CASCADE`);
}

export async function createAdmin(email = "admin@example.test") {
  return prisma.user.create({ data: { email, name: "Test Admin" } });
}

/** The session Auth.js would hand out after sign-in: the user id plus a live refresh session. */
export async function sessionFor(userId: string) {
  const { createAdminSession } = await import("@/lib/services/admin-sessions");
  return { user: { id: userId }, sid: (await createAdminSession(userId)).id };
}
