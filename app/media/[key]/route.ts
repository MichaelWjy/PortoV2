import { connection } from "next/server";
import { prisma } from "@/lib/db";
import { OBJECT_KEY_PATTERN, storage } from "@/lib/storage/drivers";

/**
 * Serves managed media by immutable object key. Only keys that exist in MediaAsset are served,
 * so deleted assets stop resolving even if the object lingers in storage.
 */
export async function GET(_req: Request, { params }: RouteContext<"/media/[key]">) {
  await connection();
  const { key } = await params;
  if (!OBJECT_KEY_PATTERN.test(key)) return new Response("Not found", { status: 404 });
  try {
    const asset = await prisma.mediaAsset.findUnique({ where: { objectKey: key }, select: { mimeType: true, fileName: true } });
    if (!asset) return new Response("Not found", { status: 404 });
    const body = await storage().get(key);
    if (!body) return new Response("Not found", { status: 404 });
    return new Response(new Uint8Array(body), {
      headers: {
        "content-type": asset.mimeType,
        "cache-control": "public, max-age=31536000, immutable",
        "x-content-type-options": "nosniff",
        "content-security-policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
        ...(asset.mimeType === "application/pdf" ? { "content-disposition": `inline; filename="${asset.fileName.replace(/"/g, "")}"` } : {}),
      },
    });
  } catch (e) {
    console.error("[media] failed to serve", key, e);
    return new Response("Unavailable", { status: 503 });
  }
}
