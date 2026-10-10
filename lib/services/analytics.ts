import "server-only";
import type { z } from "zod";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { hashValue } from "@/lib/security/request";
import type { analyticsEventSchema } from "@/lib/validation/schemas";

export const ANALYTICS_RETENTION_DAYS = 180;

/** External referrer host only; same-site and malformed referrers are dropped. Pure. */
export function referrerDomain(referrer: string | undefined, ownHost: string): string | null {
  if (!referrer) return null;
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, "");
    return host && host !== ownHost.replace(/^www\./, "") ? host.slice(0, 120) : null;
  } catch {
    return null;
  }
}

export async function recordEvent(input: z.output<typeof analyticsEventSchema>, ip: string, userAgent: string, now = new Date()) {
  const projectId = input.projectSlug
    ? ((await prisma.project.findFirst({ where: { slug: input.projectSlug, status: "PUBLISHED" }, select: { id: true } }))?.id ?? null)
    : null;
  await prisma.analyticsEvent.create({
    data: {
      eventType: input.type,
      path: input.path.split("?")[0].slice(0, 300),
      projectId,
      // Daily-rotating pseudonym: counts unique visitors per day without storing IPs or a persistent ID.
      visitorHash: hashValue(ip, userAgent, now.toISOString().slice(0, 10)),
      referrerDomain: referrerDomain(input.referrer, new URL(env.APP_URL).hostname),
    },
  });
}

export async function analyticsSummary(days = 30) {
  const since = new Date(Date.now() - days * 86_400_000);
  const where = { createdAt: { gte: since } };
  const [pageViews, visitors, topPaths, topReferrers, topProjects, daily] = await Promise.all([
    prisma.analyticsEvent.count({ where: { ...where, eventType: "PAGE_VIEW" } }),
    prisma.analyticsEvent.groupBy({ by: ["visitorHash"], where }).then((r) => r.length),
    prisma.analyticsEvent.groupBy({ by: ["path"], where: { ...where, eventType: "PAGE_VIEW" }, _count: { _all: true }, orderBy: { _count: { path: "desc" } }, take: 10 }),
    prisma.analyticsEvent.groupBy({ by: ["referrerDomain"], where: { ...where, referrerDomain: { not: null } }, _count: { _all: true }, orderBy: { _count: { referrerDomain: "desc" } }, take: 10 }),
    prisma.analyticsEvent.groupBy({ by: ["projectId"], where: { ...where, eventType: "PROJECT_VIEW", projectId: { not: null } }, _count: { _all: true }, orderBy: { _count: { projectId: "desc" } }, take: 10 }),
    prisma.$queryRaw<{ day: Date; views: bigint }[]>`
      SELECT date_trunc('day', "createdAt") AS day, count(*) AS views
      FROM "AnalyticsEvent" WHERE "eventType" = 'PAGE_VIEW' AND "createdAt" >= ${since}
      GROUP BY 1 ORDER BY 1`,
  ]);
  const projectTitles = new Map(
    (await prisma.project.findMany({ where: { id: { in: topProjects.map((p) => p.projectId!) } }, select: { id: true, title: true } })).map((p) => [p.id, p.title]),
  );
  return {
    days,
    pageViews,
    // Visitor hashes rotate daily, so this is "visitor-days", an upper bound on unique people.
    visitorDays: visitors,
    topPaths: topPaths.map((p) => ({ label: p.path, count: p._count._all })),
    topReferrers: topReferrers.map((r) => ({ label: r.referrerDomain ?? "", count: r._count._all })),
    topProjects: topProjects.map((p) => ({ label: projectTitles.get(p.projectId!) ?? "(deleted project)", count: p._count._all })),
    daily: daily.map((d) => ({ day: d.day.toISOString().slice(0, 10), views: Number(d.views) })),
  };
}
