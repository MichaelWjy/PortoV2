import { prisma } from "@/lib/db";
import { assetUsage, mediaUrl } from "@/lib/services/media";
import { Empty, PageHeader } from "@/components/admin/ui";
import { RecordButton } from "@/components/admin/RecordButton";
import { AltForm, ReplaceForm, UploadForm } from "@/components/admin/MediaForms";
import { deleteRecord, replaceMedia, updateMediaAlt, uploadMedia } from "../actions";

export const metadata = { title: "Media" };

export default async function MediaPage() {
  const assets = await prisma.mediaAsset.findMany({ orderBy: { createdAt: "desc" } });
  const usage = await Promise.all(assets.map((a) => assetUsage(a.id)));

  return (
    <>
      <PageHeader title="Media" description="Files are stored in object storage; only metadata lives in the database. Files in use cannot be deleted." />
      <UploadForm action={uploadMedia} />
      {assets.length === 0 ? (
        <Empty>No files uploaded yet.</Empty>
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
    </>
  );
}
