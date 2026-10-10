import "server-only";
import { randomUUID } from "node:crypto";
import { imageSize } from "image-size";
import { prisma } from "@/lib/db";
import { storage } from "@/lib/storage/drivers";
import { detectFileType, MAX_UPLOAD_BYTES } from "@/lib/storage/file-type";
import { recordAudit } from "@/lib/services/audit";
import { invalidatePublicContent } from "@/lib/services/cache";
import { ServiceError } from "@/lib/services/errors";

type Prepared = { buffer: Buffer; key: string; mime: string; width: number | null; height: number | null; fileName: string; size: number };

async function prepare(file: File): Promise<Prepared> {
  if (!(file instanceof File) || file.size === 0) throw new ServiceError("Choose a file to upload.");
  if (file.size > MAX_UPLOAD_BYTES) throw new ServiceError(`Files must be ${MAX_UPLOAD_BYTES / 1024 / 1024} MB or smaller.`);
  const buffer = Buffer.from(await file.arrayBuffer());
  const type = detectFileType(buffer);
  if (!type) throw new ServiceError("Unsupported file type. Use JPEG, PNG, WebP, GIF, AVIF or PDF.");

  let width: number | null = null;
  let height: number | null = null;
  if (type.isImage) {
    try {
      const size = imageSize(buffer);
      width = size.width ?? null;
      height = size.height ?? null;
    } catch {
      throw new ServiceError("The image could not be read. It may be corrupted.");
    }
  }
  // The original name is metadata only; it never becomes part of a path.
  const fileName = file.name.replace(/[^\w.\- ]+/g, "_").slice(0, 120) || `upload.${type.ext}`;
  return { buffer, key: `${randomUUID()}.${type.ext}`, mime: type.mime, width, height, fileName, size: file.size };
}

export async function uploadAsset(file: File, altText: string, actorId: string) {
  const p = await prepare(file);
  await storage().put(p.key, p.buffer, p.mime);
  try {
    const asset = await prisma.mediaAsset.create({
      data: { fileName: p.fileName, objectKey: p.key, mimeType: p.mime, fileSize: p.size, width: p.width, height: p.height, altText, uploadedById: actorId },
    });
    await recordAudit({ actorId, action: "upload", entityType: "MediaAsset", entityId: asset.id, metadata: { fileName: p.fileName, mimeType: p.mime } });
    return asset;
  } catch (e) {
    await storage().remove(p.key).catch(() => undefined);
    throw e;
  }
}

/** Replaces the file behind an asset. References keep working; the URL changes, which busts CDN caches. */
export async function replaceAsset(id: string, file: File, actorId: string) {
  const existing = await prisma.mediaAsset.findUnique({ where: { id } });
  if (!existing) throw new ServiceError("Asset not found.");
  const p = await prepare(file);
  await storage().put(p.key, p.buffer, p.mime);
  try {
    const asset = await prisma.mediaAsset.update({
      where: { id },
      data: { fileName: p.fileName, objectKey: p.key, mimeType: p.mime, fileSize: p.size, width: p.width, height: p.height },
    });
    await recordAudit({ actorId, action: "replace", entityType: "MediaAsset", entityId: id, metadata: { fileName: p.fileName } });
    invalidatePublicContent();
    await storage().remove(existing.objectKey).catch((e) => console.error("[media] failed to remove replaced object", existing.objectKey, e));
    return asset;
  } catch (e) {
    await storage().remove(p.key).catch(() => undefined);
    throw e;
  }
}

export async function assetUsage(id: string) {
  const asset = await prisma.mediaAsset.findUnique({
    where: { id },
    select: {
      profileImages: { select: { id: true } },
      profileResume: { select: { id: true } },
      profileAboutImages: { select: { id: true } },
      projectCovers: { select: { title: true } },
      milestones: { select: { title: true } },
      certifications: { select: { name: true } },
    },
  });
  if (!asset) return [];
  return [
    ...asset.profileImages.map(() => "Profile photo"),
    ...asset.profileResume.map(() => "Profile résumé"),
    ...asset.profileAboutImages.map(() => "About photo"),
    ...asset.projectCovers.map((p) => `Project cover: ${p.title}`),
    ...asset.milestones.map((m) => `Milestone image: ${m.title}`),
    ...asset.certifications.map((c) => `Certification: ${c.name}`),
  ];
}

export async function updateAssetAlt(id: string, altText: string, actorId: string) {
  await prisma.mediaAsset.update({ where: { id }, data: { altText } });
  await recordAudit({ actorId, action: "update", entityType: "MediaAsset", entityId: id });
  invalidatePublicContent();
}

export async function deleteAsset(id: string, actorId: string) {
  const usage = await assetUsage(id);
  if (usage.length) throw new ServiceError(`This file is still in use (${usage.join(", ")}). Remove those references first.`);
  const asset = await prisma.mediaAsset.findUnique({ where: { id } });
  if (!asset) throw new ServiceError("Asset not found.");
  // Foreign keys use RESTRICT, so a reference added concurrently makes this delete fail instead of leaving a dangling link.
  await prisma.mediaAsset.delete({ where: { id } });
  await recordAudit({ actorId, action: "delete", entityType: "MediaAsset", entityId: id, metadata: { fileName: asset.fileName } });
  await storage().remove(asset.objectKey).catch((e) => console.error("[media] orphaned object after delete", asset.objectKey, e));
}

export function mediaUrl(objectKey: string) {
  return `/media/${objectKey}`;
}
