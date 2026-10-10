import "server-only";
import type { z } from "zod";
import type { ContentStatus, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { recordAudit, type AuditEntry } from "@/lib/services/audit";
import { invalidatePublicContent } from "@/lib/services/cache";
import { ServiceError } from "@/lib/services/errors";
import type {
  educationSchema,
  experienceSchema,
  certificationSchema,
  milestoneSchema,
  profileSchema,
  projectSchema,
  siteSettingsSchema,
  skillSchema,
  socialLinkSchema,
  technologySchema,
} from "@/lib/validation/schemas";

type Tx = Prisma.TransactionClient;

/** Which audit action a save represents. Pure, exported for tests. */
export function lifecycleAction(previous: ContentStatus | null | undefined, next: ContentStatus | null, isNew: boolean): AuditEntry["action"] {
  if (isNew) return "create";
  if (next && previous !== next) return next === "PUBLISHED" ? "publish" : "unpublish";
  return "update";
}

/** publishedAt keeps the first publication time and clears when unpublished. Pure, exported for tests. */
export function nextPublishedAt(status: ContentStatus, previous: Date | null | undefined, now = new Date()): Date | null {
  return status === "PUBLISHED" ? (previous ?? now) : null;
}

async function mutate<T extends { id: string }>(
  actorId: string,
  entityType: string,
  action: AuditEntry["action"],
  run: (tx: Tx) => Promise<T>,
  label?: (r: T) => string,
): Promise<T> {
  const result = await prisma.$transaction(async (tx) => {
    const r = await run(tx);
    await recordAudit({ actorId, action, entityType, entityId: r.id, metadata: label ? { label: label(r) } : undefined }, tx);
    return r;
  });
  invalidatePublicContent();
  return result;
}

function notFound(entity: string): never {
  throw new ServiceError(`${entity} not found.`);
}

// Projects -------------------------------------------------------------------

export async function saveProject(id: string | null, input: z.output<typeof projectSchema>, actorId: string) {
  const { technologyIds, ...data } = input;
  const before = id ? ((await prisma.project.findUnique({ where: { id }, select: { status: true, publishedAt: true } })) ?? notFound("Project")) : null;
  const publishedAt = nextPublishedAt(data.status, before?.publishedAt);
  const technologies = { create: [...new Set(technologyIds)].map((technologyId) => ({ technologyId })) };
  return mutate(
    actorId,
    "Project",
    lifecycleAction(before?.status, data.status, !id),
    (tx) =>
      id
        ? tx.project.update({ where: { id }, data: { ...data, publishedAt, technologies: { deleteMany: {}, ...technologies } } })
        : tx.project.create({ data: { ...data, publishedAt, technologies } }),
    (p) => p.title,
  );
}

export async function setProjectStatus(id: string, status: ContentStatus, actorId: string) {
  const before = (await prisma.project.findUnique({ where: { id }, select: { status: true, publishedAt: true } })) ?? notFound("Project");
  return mutate(actorId, "Project", lifecycleAction(before.status, status, false), (tx) =>
    tx.project.update({ where: { id }, data: { status, publishedAt: nextPublishedAt(status, before.publishedAt) } }),
  );
}

export const deleteProject = (id: string, actorId: string) =>
  mutate(actorId, "Project", "delete", (tx) => tx.project.delete({ where: { id } }), (p) => p.title);

// Technologies ---------------------------------------------------------------

export const saveTechnology = (id: string | null, data: z.output<typeof technologySchema>, actorId: string) =>
  mutate(actorId, "Technology", id ? "update" : "create", (tx) =>
    id ? tx.technology.update({ where: { id }, data }) : tx.technology.create({ data }),
  (t) => t.name);

export const deleteTechnology = (id: string, actorId: string) =>
  mutate(actorId, "Technology", "delete", (tx) => tx.technology.delete({ where: { id } }), (t) => t.name);

// Experience, education, skills ------------------------------------------------

async function statusOf(find: () => Promise<{ status: ContentStatus } | null>, entity: string) {
  return ((await find()) ?? notFound(entity)).status;
}

export async function saveExperience(id: string | null, data: z.output<typeof experienceSchema>, actorId: string) {
  const prev = id ? await statusOf(() => prisma.experience.findUnique({ where: { id }, select: { status: true } }), "Experience") : null;
  const clean = { ...data, endDate: data.isCurrent ? null : data.endDate };
  return mutate(actorId, "Experience", lifecycleAction(prev, data.status, !id), (tx) =>
    id ? tx.experience.update({ where: { id }, data: clean }) : tx.experience.create({ data: clean }),
  (e) => e.organization);
}

export const deleteExperience = (id: string, actorId: string) =>
  mutate(actorId, "Experience", "delete", (tx) => tx.experience.delete({ where: { id } }), (e) => e.organization);

export async function saveEducation(id: string | null, data: z.output<typeof educationSchema>, actorId: string) {
  const prev = id ? await statusOf(() => prisma.education.findUnique({ where: { id }, select: { status: true } }), "Education") : null;
  const clean = { ...data, endDate: data.isCurrent ? null : data.endDate };
  return mutate(actorId, "Education", lifecycleAction(prev, data.status, !id), (tx) =>
    id ? tx.education.update({ where: { id }, data: clean }) : tx.education.create({ data: clean }),
  (e) => e.institution);
}

export const deleteEducation = (id: string, actorId: string) =>
  mutate(actorId, "Education", "delete", (tx) => tx.education.delete({ where: { id } }), (e) => e.institution);

export async function saveSkill(id: string | null, data: z.output<typeof skillSchema>, actorId: string) {
  const prev = id ? await statusOf(() => prisma.skill.findUnique({ where: { id }, select: { status: true } }), "Skill") : null;
  return mutate(actorId, "Skill", lifecycleAction(prev, data.status, !id), (tx) =>
    id ? tx.skill.update({ where: { id }, data }) : tx.skill.create({ data }),
  (s) => s.name);
}

export const deleteSkill = (id: string, actorId: string) =>
  mutate(actorId, "Skill", "delete", (tx) => tx.skill.delete({ where: { id } }), (s) => s.name);

// Milestones -----------------------------------------------------------------

export async function saveMilestone(id: string | null, data: z.output<typeof milestoneSchema>, actorId: string) {
  const prev = id ? await statusOf(() => prisma.milestone.findUnique({ where: { id }, select: { status: true } }), "Milestone") : null;
  return mutate(actorId, "Milestone", lifecycleAction(prev, data.status, !id), (tx) =>
    id ? tx.milestone.update({ where: { id }, data }) : tx.milestone.create({ data }),
  (m) => m.title);
}

export const deleteMilestone = (id: string, actorId: string) =>
  mutate(actorId, "Milestone", "delete", (tx) => tx.milestone.delete({ where: { id } }), (m) => m.title);

// Certifications ---------------------------------------------------------------

export async function saveCertification(id: string | null, data: z.output<typeof certificationSchema>, actorId: string) {
  const prev = id ? await statusOf(() => prisma.certification.findUnique({ where: { id }, select: { status: true } }), "Certification") : null;
  return mutate(actorId, "Certification", lifecycleAction(prev, data.status, !id), (tx) =>
    id ? tx.certification.update({ where: { id }, data }) : tx.certification.create({ data }),
  (c) => c.name);
}

export const deleteCertification = (id: string, actorId: string) =>
  mutate(actorId, "Certification", "delete", (tx) => tx.certification.delete({ where: { id } }), (c) => c.name);

// Social links ---------------------------------------------------------------

export const saveSocialLink = (id: string | null, data: z.output<typeof socialLinkSchema>, actorId: string) =>
  mutate(actorId, "SocialLink", id ? "update" : "create", (tx) =>
    id ? tx.socialLink.update({ where: { id }, data }) : tx.socialLink.create({ data }),
  (s) => s.platform);

export const deleteSocialLink = (id: string, actorId: string) =>
  mutate(actorId, "SocialLink", "delete", (tx) => tx.socialLink.delete({ where: { id } }), (s) => s.platform);

// Singletons -------------------------------------------------------------------

export async function saveProfile(data: z.output<typeof profileSchema>, actorId: string) {
  // The picker only lists matching files, but the server is the trust boundary.
  const mime = (id: string | null) => (id ? prisma.mediaAsset.findUnique({ where: { id }, select: { mimeType: true } }) : null);
  const [image, aboutImage, cv] = await Promise.all([
    mime(data.profileImageAssetId),
    mime(data.aboutImageAssetId),
    mime(data.resumeAssetId),
  ]);
  if (data.profileImageAssetId && !image?.mimeType.startsWith("image/")) throw new ServiceError("The portrait must be an image.");
  if (data.aboutImageAssetId && !aboutImage?.mimeType.startsWith("image/")) throw new ServiceError("The About photo must be an image.");
  if (data.resumeAssetId && cv?.mimeType !== "application/pdf") throw new ServiceError("The CV must be a PDF file.");
  return mutate(actorId, "Profile", "update", (tx) => tx.profile.upsert({ where: { id: "profile" }, update: data, create: { id: "profile", ...data } }));
}

export const saveSiteSettings = (data: z.output<typeof siteSettingsSchema>, actorId: string) =>
  mutate(actorId, "SiteSettings", "update", (tx) => tx.siteSettings.upsert({ where: { id: "site" }, update: data, create: { id: "site", ...data } }));
