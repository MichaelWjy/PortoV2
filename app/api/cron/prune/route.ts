import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { pruneOldData } from "@/lib/retention";

/**
 * Daily retention job, called by Vercel Cron (vercel.json). Vercel sends `Authorization: Bearer <CRON_SECRET>`
 * when the CRON_SECRET variable is set; without a configured secret the endpoint stays disabled.
 */
export async function GET(req: Request) {
  const secret = env.CRON_SECRET;
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret ?? ""}`);
  if (!secret || given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return new Response(null, { status: 401 });
  }
  try {
    const removed = await pruneOldData(prisma);
    console.log(JSON.stringify({ level: "info", msg: "retention prune", ...removed }));
    return Response.json({ ok: true, removed }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    console.error("[cron] prune failed", e);
    return Response.json({ ok: false }, { status: 500, headers: { "cache-control": "no-store" } });
  }
}
