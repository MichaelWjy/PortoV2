import { NextRequest } from "next/server";
import { analyticsEventSchema } from "@/lib/validation/schemas";
import { recordEvent } from "@/lib/services/analytics";
import { consumeRateLimit, RATE_LIMITS } from "@/lib/security/rate-limit";
import { clientIp, hashValue } from "@/lib/security/request";
import { env } from "@/lib/env";

const noContent = () => new Response(null, { status: 204 });

export async function POST(req: NextRequest) {
  // Same-origin only; browsers always send Origin on POST. Do Not Track / GPC are honoured.
  const origin = req.headers.get("origin");
  if (!origin || new URL(origin).host !== new URL(env.APP_URL).host) return new Response(null, { status: 403 });
  if (req.headers.get("dnt") === "1" || req.headers.get("sec-gpc") === "1") return noContent();

  const text = await req.text();
  if (text.length > 2000) return new Response(null, { status: 413 });
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return new Response(null, { status: 400 });
  }
  const parsed = analyticsEventSchema.safeParse(json);
  if (!parsed.success) return new Response(null, { status: 400 });

  try {
    const ip = await clientIp();
    if (!(await consumeRateLimit(`analytics:${hashValue(ip)}`, RATE_LIMITS.analytics))) return new Response(null, { status: 429 });
    await recordEvent(parsed.data, ip, req.headers.get("user-agent") ?? "");
  } catch (e) {
    console.error("[analytics] failed to record event", e);
  }
  return noContent();
}
