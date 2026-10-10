import "server-only";
import type { z } from "zod";
import { prisma } from "@/lib/db";
import type { contactSchema } from "@/lib/validation/schemas";

export function createContactMessage(data: z.output<typeof contactSchema>) {
  return prisma.contactMessage.create({ data, select: { id: true } });
}

/** Heuristics for automated submissions: a filled honeypot or a form sent faster than a human could type. Pure. */
export function looksLikeSpam(honeypot: unknown, startedAt: unknown, now = Date.now()): boolean {
  if (typeof honeypot === "string" && honeypot.trim() !== "") return true;
  // Without JavaScript there is no timestamp; the honeypot and rate limit still apply.
  if (typeof startedAt !== "string" || startedAt === "") return false;
  const started = Number(startedAt);
  return !Number.isFinite(started) || now - started < 2500;
}
