import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { analyticsSummary } from "@/lib/services/analytics";
import { Empty, PageHeader, StatusBadge } from "@/components/admin/ui";

export default async function DashboardPage() {
  const [published, drafts, experiences, milestones, newMessages, messages, logs, traffic] = await Promise.all([
    prisma.project.count({ where: { status: "PUBLISHED" } }),
    prisma.project.count({ where: { status: "DRAFT" } }),
    prisma.experience.count(),
    prisma.milestone.count(),
    prisma.contactMessage.count({ where: { status: "NEW" } }),
    prisma.contactMessage.findMany({ orderBy: { createdAt: "desc" }, take: 5, select: { id: true, name: true, subject: true, status: true, createdAt: true } }),
    prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { actor: { select: { email: true } } } }),
    analyticsSummary(30),
  ]);

  const stats = [
    ["Published projects", published, "/admin/projects?status=PUBLISHED"],
    ["Draft projects", drafts, "/admin/projects?status=DRAFT"],
    ["Experience entries", experiences, "/admin/experience"],
    ["Milestones", milestones, "/admin/milestones"],
    ["New messages", newMessages, "/admin/messages?status=NEW"],
    ["Page views (30 days)", traffic.pageViews, "/admin/analytics"],
  ] as const;

  return (
    <>
      <PageHeader title="Dashboard" description="Live counts from the database." />
      <div className="adm-stats">
        {stats.map(([label, value, href]) => (
          <Link key={label} href={href} className="adm-stat">
            <b>{value}</b>
            <span>{label}</span>
          </Link>
        ))}
      </div>
      <div className="adm-grid2">
        <section className="adm-card">
          <h2>Recent messages</h2>
          {messages.length === 0 ? (
            <Empty>No messages yet.</Empty>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 10 }}>
              {messages.map((m) => (
                <li key={m.id} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <Link href={`/admin/messages#m-${m.id}`}>
                    {m.name}
                    {m.subject ? ` — ${m.subject}` : ""}
                  </Link>
                  <span className="adm-inline">
                    <StatusBadge status={m.status} />
                    <span className="adm-muted">{formatDateTime(m.createdAt)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="adm-card">
          <h2>Recent changes</h2>
          {logs.length === 0 ? (
            <Empty>No changes recorded yet.</Empty>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 10 }}>
              {logs.map((l) => (
                <li key={l.id}>
                  <b style={{ fontWeight: 500 }}>
                    {l.action} {l.entityType}
                  </b>
                  <span className="adm-muted">
                    {" "}
                    · {l.actor?.email ?? "deleted user"} · {formatDateTime(l.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
