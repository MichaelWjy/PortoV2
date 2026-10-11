import Link from "next/link";
import { notFound } from "next/navigation";
import { ENTITIES } from "@/lib/admin/registry";
import { deleteRecord, setProjectStatus } from "../actions";
import { Empty, PageHeader, Pager, pageParam, Saved, StatusBadge } from "@/components/admin/ui";

const PAGE_SIZE = 25;
import { RecordButton } from "@/components/admin/RecordButton";

export default async function EntityListPage({ params, searchParams }: PageProps<"/admin/[entity]">) {
  const { entity } = await params;
  const config = Object.hasOwn(ENTITIES, entity) ? ENTITIES[entity] : null;
  if (!config) notFound();
  const sp = await searchParams;
  const search = typeof sp.q === "string" ? sp.q.slice(0, 100) : undefined;
  const status = typeof sp.status === "string" ? sp.status : undefined;
  const all = await config.list({ search, status });
  // ponytail: content tables hold tens of rows, so the list loads fully and is sliced here; move skip/take into config.list if one grows to thousands.
  const pages = Math.max(1, Math.ceil(all.length / PAGE_SIZE));
  const page = Math.min(pageParam(sp.page), pages);
  const rows = all.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const href = (n: number) => `/admin/${entity}?${new URLSearchParams({ ...(search ? { q: search } : {}), ...(status ? { status } : {}), page: String(n) })}`;

  return (
    <>
      <PageHeader title={config.title} description={config.description} action={{ href: `/admin/${entity}/new`, label: `New ${config.singular}` }} />
      <Saved show={sp.saved === "1"} />
      <form className="adm-filters" role="search">
        <input className="adm-input" name="q" defaultValue={search} placeholder="Search…" aria-label={`Search ${config.title}`} />
        {config.publishable && (
          <select className="adm-input" name="status" defaultValue={status ?? ""} aria-label="Filter by status">
            <option value="">All statuses</option>
            <option value="PUBLISHED">Published</option>
            <option value="DRAFT">Draft</option>
          </select>
        )}
        <button className="adm-btn" type="submit">
          Filter
        </button>
      </form>
      {rows.length === 0 ? (
        <Empty>{search || status ? "Nothing matches these filters." : `No ${config.title.toLowerCase()} yet.`}</Empty>
      ) : (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                {config.columns.map((c) => (
                  <th key={c} scope="col">
                    {c}
                  </th>
                ))}
                {config.publishable && <th scope="col">Status</th>}
                <th scope="col">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  {r.cells.map((c, i) => (
                    <td key={i}>{i === 0 ? <Link href={`/admin/${entity}/${r.id}`}>{c}</Link> : (c ?? "—")}</td>
                  ))}
                  {config.publishable && <td>{r.status && <StatusBadge status={r.status} />}</td>}
                  <td className="actions">
                    <span className="adm-inline">
                      {entity === "projects" && r.status && (
                        <RecordButton action={setProjectStatus.bind(null, r.id, r.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED")} label={r.status === "PUBLISHED" ? "Unpublish" : "Publish"} />
                      )}
                      {r.previewHref && (
                        <a className="adm-btn adm-btn-sm" href={r.previewHref} target="_blank" rel="noopener">
                          Preview
                        </a>
                      )}
                      <Link className="adm-btn adm-btn-sm" href={`/admin/${entity}/${r.id}`}>
                        Edit
                      </Link>
                      <RecordButton action={deleteRecord.bind(null, config.deleteKey, r.id)} label="Delete" variant="danger" confirm={`Delete this ${config.singular}? This cannot be undone.`} />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pager page={page} pages={pages} href={href} />
    </>
  );
}
