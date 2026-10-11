import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { assetUsage, mediaUrl } from "@/lib/services/media";
import { Empty, PageHeader, Pager, pageParam } from "@/components/admin/ui";
import { RecordButton } from "@/components/admin/RecordButton";
import { AltForm, ReplaceForm, UploadForm } from "@/components/admin/MediaForms";
import { deleteRecord, replaceMedia, updateMediaAlt, uploadMedia } from "../actions";

export const metadata = { title: "Media" };
const PAGE_SIZE = 24;

export default async function MediaPage({ searchParams }: PageProps<"/admin/media">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 100) : "";
  const page = pageParam(sp.page);
  const where: Prisma.MediaAssetWhereInput = q
    ? { OR: [{ fileName: { contains: q, mode: "insensitive" } }, { altText: { contains: q, mode: "insensitive" } }] }
    : {};
  const [assets, total] = await Promise.all([
    prisma.mediaAsset.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    prisma.mediaAsset.count({ where }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const href = (n: number) => `/admin/media?${new URLSearchParams({ ...(q ? { q } : {}), page: String(n) })}`;
  const usage = await Promise.all(assets.map((a) => assetUsage(a.id)));

  return (
    <>
      <PageHeader title="Media" description="Files are stored in object storage; only metadata lives in the database. Files in use cannot be deleted." />
      <UploadForm action={uploadMedia} />
      <form className="adm-filters" role="search" style={{ marginTop: 24 }}>
        <input className="adm-input" type="search" name="q" defaultValue={q} placeholder="Search by file name or alt text…" aria-label="Search media" />
        <button className="adm-btn" type="submit">
          Search
        </button>
        <span className="adm-muted" style={{ alignSelf: "center" }}>
          {total} file{total === 1 ? "" : "s"}
        </span>
      </form>
      {assets.length === 0 ? (
        <Empty>{q ? "No file matches this search." : "No files uploaded yet."}</Empty>
      ) : (
        <div className="adm-media">
          {assets.map((a, i) => (
            <article key={a.id} className="adm-card">
              {a.mimeType.startsWith("image/") ? (
                // eslint-disable-next-line @next/next/no-img-element -- admin preview of a managed asset
                <img src={mediaUrl(a.objectKey)} alt={a.altText} loading="lazy" />
              ) : (
                <a className="doc" href={mediaUrl(a.objectKey)} target="_blank" rel="noopener">
                  PDF ↗
                </a>
              )}
              <div style={{ fontSize: 12 }}>
                <b style={{ fontWeight: 500, wordBreak: "break-all" }}>{a.fileName}</b>
                <div className="adm-muted">
                  {a.mimeType} · {(a.fileSize / 1024).toFixed(0)} KB{a.width ? ` · ${a.width}×${a.height}` : ""}
                </div>
                <div className="adm-muted">{usage[i].length ? `Used by: ${usage[i].join(", ")}` : "Not used"}</div>
              </div>
              <AltForm action={updateMediaAlt} id={a.id} altText={a.altText} />
              <ReplaceForm action={replaceMedia} id={a.id} />
              <RecordButton action={deleteRecord.bind(null, "media", a.id)} label="Delete" variant="danger" confirm={`Delete ${a.fileName}? This cannot be undone.`} />
            </article>
          ))}
        </div>
      )}
      <Pager page={page} pages={pages} href={href} />
    </>
  );
}
