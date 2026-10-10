import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ unstable_cache: <T>(fn: T) => fn, revalidateTag: vi.fn(), revalidatePath: vi.fn() }));

import { prisma } from "@/lib/db";
import { storage } from "@/lib/storage/drivers";
import { deleteAsset, replaceAsset, uploadAsset } from "@/lib/services/media";
import { saveCertification, saveProfile, saveProject } from "@/lib/services/content";
import { getHomeContent } from "@/lib/services/public";
import { createContactMessage } from "@/lib/services/contact";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { certificationSchema, profileSchema, projectSchema } from "@/lib/validation/schemas";
import { createAdmin, resetDatabase } from "../support/db";

// 1x1 transparent PNG.
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
const png = (name = "photo.png") => new File([PNG], name, { type: "image/png" });

let actor: string;
beforeEach(async () => {
  await resetDatabase();
  actor = (await createAdmin()).id;
});

describe("media library", () => {
  it("stores the file in object storage and only metadata in PostgreSQL", async () => {
    const asset = await uploadAsset(png("../../evil name.png"), "A photo", actor);
    expect(asset.objectKey).toMatch(/^[0-9a-f-]{36}\.png$/);
    expect(asset.fileName).not.toContain("/");
    expect([asset.width, asset.height]).toEqual([1, 1]);
    expect(await storage().get(asset.objectKey)).not.toBeNull();
  });

  it("rejects files whose content is not an allowed type, whatever their name", async () => {
    const fake = new File(["<svg onload=alert(1)></svg>"], "image.png", { type: "image/png" });
    await expect(uploadAsset(fake, "", actor)).rejects.toThrow(/Unsupported file type/);
    expect(await prisma.mediaAsset.count()).toBe(0);
  });

  it("refuses to delete an asset that a project uses", async () => {
    const asset = await uploadAsset(png(), "", actor);
    await saveProject(null, projectSchema.parse({ title: "P", slug: "p", projectType: "t", shortDescription: "s", description: "d", status: "DRAFT", coverAssetId: asset.id }), actor);
    await expect(deleteAsset(asset.id, actor)).rejects.toThrow(/Project cover: P/);
  });

  it("replaces a file in place and removes the old object", async () => {
    const asset = await uploadAsset(png(), "", actor);
    const replaced = await replaceAsset(asset.id, png("new.png"), actor);
    expect(replaced.id).toBe(asset.id);
    expect(replaced.objectKey).not.toBe(asset.objectKey);
    expect(await storage().get(asset.objectKey)).toBeNull();
  });

  it("deletes unused assets and their objects", async () => {
    const asset = await uploadAsset(png(), "", actor);
    await deleteAsset(asset.id, actor);
    expect(await storage().get(asset.objectKey)).toBeNull();
    expect(await prisma.auditLog.count({ where: { entityType: "MediaAsset", action: "delete" } })).toBe(1);
  });
});

describe("project gallery", () => {
  const project = (over: Record<string, unknown>) =>
    projectSchema.parse({ title: "P", slug: "p", projectType: "t", shortDescription: "s", description: "d", status: "PUBLISHED", ...over });

  it("stores gallery images in the submitted order and protects them from deletion", async () => {
    const [a, b] = [await uploadAsset(png("a.png"), "A", actor), await uploadAsset(png("b.png"), "B", actor)];
    const p = await saveProject(null, project({ galleryAssetIds: [b.id, a.id] }), actor);
    const rows = await prisma.projectImage.findMany({ where: { projectId: p.id }, orderBy: { sortOrder: "asc" } });
    expect(rows.map((r) => r.assetId)).toEqual([b.id, a.id]);
    await expect(deleteAsset(a.id, actor)).rejects.toThrow(/Project gallery: P/);

    await saveProject(p.id, project({ galleryAssetIds: [a.id] }), actor);
    expect((await prisma.projectImage.findMany({ where: { projectId: p.id } })).map((r) => r.assetId)).toEqual([a.id]);
  });

  it("refuses non-image files in the gallery", async () => {
    const pdf = await uploadAsset(new File([Buffer.from("%PDF-1.7 minimal test document %%EOF")], "doc.pdf", { type: "application/pdf" }), "", actor);
    await expect(saveProject(null, project({ galleryAssetIds: [pdf.id] }), actor)).rejects.toThrow(/must be images/);
  });
});

describe("certificate files", () => {
  it("accepts an image or a PDF and tells the page which one it is", async () => {
    const pdf = await uploadAsset(new File([Buffer.from("%PDF-1.7 minimal test document %%EOF")], "cert.pdf", { type: "application/pdf" }), "", actor);
    const img = await uploadAsset(png("badge.png"), "Badge", actor);
    const cert = (name: string, imageAssetId: string) => certificationSchema.parse({ name, issuer: "Issuer", status: "PUBLISHED", imageAssetId });
    await saveCertification(null, cert("PDF cert", pdf.id), actor);
    await saveCertification(null, cert("Image cert", img.id), actor);
    const byName = Object.fromEntries((await getHomeContent()).certifications.map((c) => [c.name, c.file]));
    expect(byName["PDF cert"]).toMatchObject({ isPdf: true, url: `/media/${pdf.objectKey}` });
    expect(byName["Image cert"]).toMatchObject({ isPdf: false, alt: "Badge" });
  });
});

describe("profile CV", () => {
  const PDF = Buffer.from("%PDF-1.7 minimal test document %%EOF");
  const profile = (over: Record<string, unknown>) =>
    profileSchema.parse({ fullName: "Michael Wijaya", professionalTitle: "Software Engineer", location: "Indonesia", shortBio: "Bio", availabilityStatus: "AVAILABLE", ...over });

  it("accepts a PDF as the CV and exposes it for download", async () => {
    const cv = await uploadAsset(new File([PDF], "cv.pdf", { type: "application/pdf" }), "", actor);
    await saveProfile(profile({ resumeAssetId: cv.id }), actor);
    expect((await prisma.profile.findUnique({ where: { id: "profile" } }))?.resumeAssetId).toBe(cv.id);
    await expect(deleteAsset(cv.id, actor)).rejects.toThrow(/résumé/);
  });

  it("refuses an image as the CV and a PDF as the portrait", async () => {
    const img = await uploadAsset(png(), "", actor);
    const cv = await uploadAsset(new File([PDF], "cv.pdf", { type: "application/pdf" }), "", actor);
    await expect(saveProfile(profile({ resumeAssetId: img.id }), actor)).rejects.toThrow(/CV must be a PDF/);
    await expect(saveProfile(profile({ profileImageAssetId: cv.id }), actor)).rejects.toThrow(/portrait must be an image/);
  });
});

describe("contact messages and rate limiting", () => {
  it("persists a validated message", async () => {
    await createContactMessage({ name: "Ada", email: "ada@example.test", subject: null, message: "Hello there, nice site!" });
    const [m] = await prisma.contactMessage.findMany();
    expect(m).toMatchObject({ name: "Ada", status: "NEW" });
  });

  it("allows up to the limit per window, then blocks, then resets in the next window", async () => {
    const rule = { limit: 3, windowMs: 60_000 };
    const t = 1_000_000_000;
    const results = [];
    for (let i = 0; i < 4; i++) results.push(await consumeRateLimit("test:key", rule, t));
    expect(results).toEqual([true, true, true, false]);
    expect(await consumeRateLimit("test:key", rule, t + 60_000)).toBe(true);
    expect(await consumeRateLimit("test:other", rule, t)).toBe(true);
  });
});
