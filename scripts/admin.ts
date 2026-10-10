/**
 * Administrator allow-list management. Run on the server (or with DATABASE_URL pointing at the target DB):
 *   npm run admin -- list
 *   npm run admin -- add owner@example.com "Owner Name"
 *   npm run admin -- revoke owner@example.com
 *   npm run admin -- restore owner@example.com
 *   npm run admin -- unbind owner@example.com   (clears the linked Google account, e.g. after moving the e-mail to a new Google account)
 * There is no public sign-up: only e-mails added here can sign in, and only with Google.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { caFromEnv, pgOptions } from "../lib/db-ssl";

const prisma = new PrismaClient({ adapter: new PrismaPg(pgOptions(process.env.DATABASE_URL!, caFromEnv(process.env))) });

async function main() {
  const [command, rawEmail, name] = process.argv.slice(2);
  const email = rawEmail?.trim().toLowerCase();
  const needEmail = () => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("A valid e-mail address is required.");
    return email;
  };

  switch (command) {
    case "list": {
      const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });
      console.table(users.map((u) => ({ email: u.email, active: u.isActive, linked: Boolean(u.providerSubject), lastLogin: u.lastLoginAt?.toISOString() ?? "-" })));
      break;
    }
    case "add": {
      const user = await prisma.user.upsert({ where: { email: needEmail() }, update: { isActive: true }, create: { email: needEmail(), name: name ?? null } });
      console.log(`Admin allowed: ${user.email}. They can now sign in with Google.`);
      break;
    }
    case "revoke":
      await prisma.user.update({ where: { email: needEmail() }, data: { isActive: false } });
      console.log(`Admin revoked: ${email}. Takes effect on their next request.`);
      break;
    case "restore":
      await prisma.user.update({ where: { email: needEmail() }, data: { isActive: true } });
      console.log(`Admin restored: ${email}.`);
      break;
    case "unbind":
      await prisma.user.update({ where: { email: needEmail() }, data: { providerSubject: null } });
      console.log(`Google link cleared for ${email}. The next allowed sign-in with this e-mail will bind again.`);
      break;
    default:
      throw new Error("Usage: npm run admin -- <list|add|revoke|restore|unbind> [email] [name]");
  }
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
