import { connection } from "next/server";
import { prisma } from "@/lib/db";

/** Liveness + database readiness for Docker, Nginx and uptime monitors. Reveals no internals. */
export async function GET() {
  await connection();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ status: "ok" }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    console.error("[health] database check failed", e);
    return Response.json({ status: "degraded" }, { status: 503, headers: { "cache-control": "no-store" } });
  }
}
