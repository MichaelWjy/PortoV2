import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { Empty, PageHeader, Pager, pageParam } from "@/components/admin/ui";

export const metadata = { title: "Audit log" };
const PAGE_SIZE = 50;

export default async function AuditLogPage({ searchParams }: PageProps<"/admin/audit-logs">) {
  const page = pageParam((await searchParams).page);
  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE, include: { actor: { select: { email: true } } } }),
    prisma.auditLog.count(),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <PageHeader title="Audit log" description="Every administrative change. Records never include secrets or message contents. Entries older than 90 days are deleted automatically every day." />
      {logs.length === 0 ? (
        <Empty>No changes recorded yet.</Empty>
      ) : (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th scope="col">When</th>
                <th scope="col">Who</th>
                <th scope="col">Action</th>
                <th scope="col">Record</th>
                <th scope="col">Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <td style={{ whiteSpace: "nowrap" }}>{formatDateTime(l.createdAt)}</td>
                  <td>{l.actor?.email ?? "deleted user"}</td>
                  <td>{l.action}</td>
                  <td>
                    {l.entityType}
                    {l.entityId && <span className="adm-muted"> · {l.entityId}</span>}
                  </td>
                  <td className="adm-muted">{l.metadata ? JSON.stringify(l.metadata) : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pager page={page} pages={pages} href={(n) => `/admin/audit-logs?page=${n}`} prev="← Newer" next="Older →" />
    </>
  );
}
