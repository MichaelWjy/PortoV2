import Link from "next/link";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { Empty, PageHeader, StatusBadge } from "@/components/admin/ui";
import { RecordButton } from "@/components/admin/RecordButton";
import { deleteAllMessages, deleteRecord, setMessageStatus } from "../actions";

export const metadata = { title: "Messages" };
const PAGE_SIZE = 20;

export default async function MessagesPage({ searchParams }: PageProps<"/admin/messages">) {
  const sp = await searchParams;
  const status = sp.status === "NEW" || sp.status === "READ" || sp.status === "ARCHIVED" ? sp.status : undefined;
  const page = Math.max(1, Number(sp.page) || 1);
  const where: Prisma.ContactMessageWhereInput = status ? { status } : { status: { not: "ARCHIVED" } };
  const [messages, total, allCount] = await Promise.all([
    prisma.contactMessage.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    prisma.contactMessage.count({ where }),
    prisma.contactMessage.count(),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const href = (p: number) => `/admin/messages?${new URLSearchParams({ ...(status ? { status } : {}), page: String(p) })}`;

  return (
    <>
      <PageHeader title="Messages" description="Contact form submissions. Visible to administrators only; delete them when no longer needed." />
      {allCount > 0 && (
        <p style={{ marginBottom: 16 }}>
          <RecordButton
            action={deleteAllMessages}
            label={`Delete all messages (${allCount})`}
            variant="danger"
            confirm={`Permanently delete all ${allCount} messages, including archived ones? This cannot be undone.`}
          />
        </p>
      )}
      <nav className="adm-filters" aria-label="Filter messages">
        {[
          ["Inbox", "/admin/messages"],
          ["New", "/admin/messages?status=NEW"],
          ["Read", "/admin/messages?status=READ"],
          ["Archived", "/admin/messages?status=ARCHIVED"],
        ].map(([label, link]) => (
          <Link key={label} className="adm-btn adm-btn-sm" href={link}>
            {label}
          </Link>
        ))}
      </nav>
      {messages.length === 0 ? (
        <Empty>No messages here.</Empty>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {messages.map((m) => (
            <article key={m.id} id={`m-${m.id}`} className="adm-card">
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <b style={{ fontWeight: 500 }}>{m.name}</b>{" "}
                  <a className="adm-link" href={`mailto:${m.email}`}>
                    {m.email}
                  </a>
                  <div className="adm-muted">
                    {m.subject ?? "(no subject)"} · {formatDateTime(m.createdAt)}
                  </div>
                </div>
                <StatusBadge status={m.status} />
              </div>
              <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{m.message}</p>
              <div className="adm-inline" style={{ flexWrap: "wrap" }}>
                {m.status !== "READ" && <RecordButton action={setMessageStatus.bind(null, m.id, "READ")} label="Mark read" />}
                {m.status !== "ARCHIVED" && <RecordButton action={setMessageStatus.bind(null, m.id, "ARCHIVED")} label="Archive" />}
                {m.status !== "NEW" && <RecordButton action={setMessageStatus.bind(null, m.id, "NEW")} label="Mark new" />}
                <RecordButton action={deleteRecord.bind(null, "message", m.id)} label="Delete" variant="danger" confirm="Delete this message permanently?" />
              </div>
            </article>
          ))}
        </div>
      )}
      {pages > 1 && (
        <nav className="adm-filters" aria-label="Pagination" style={{ marginTop: 16 }}>
          {page > 1 && (
            <Link className="adm-btn adm-btn-sm" href={href(page - 1)}>
              ← Newer
            </Link>
          )}
          <span className="adm-muted">
            Page {page} of {pages}
          </span>
          {page < pages && (
            <Link className="adm-btn adm-btn-sm" href={href(page + 1)}>
              Older →
            </Link>
          )}
        </nav>
      )}
    </>
  );
}
