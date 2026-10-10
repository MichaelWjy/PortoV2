"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/guard";
import { handleRecordAction, handleSave } from "@/lib/admin/actions";
import type { FormState } from "@/lib/admin/form-state";
import * as content from "@/lib/services/content";
import * as media from "@/lib/services/media";
import { prisma } from "@/lib/db";
import { recordAudit } from "@/lib/services/audit";
import { toSafeMessage } from "@/lib/services/errors";
import { consumeRateLimit, RATE_LIMITS } from "@/lib/security/rate-limit";
import { signOut } from "@/lib/auth";
import {
  adminUserSchema,
  educationSchema,
  certificationSchema,
  experienceSchema,
  idSchema,
  mediaMetaSchema,
  messageStatusSchema,
  milestoneSchema,
  profileSchema,
  projectSchema,
  siteSettingsSchema,
  skillSchema,
  socialLinkSchema,
  technologySchema,
  toFieldErrors,
} from "@/lib/validation/schemas";

// Content saves ---------------------------------------------------------------

export async function saveProject(_: FormState, fd: FormData) {
  return handleSave(fd, projectSchema, content.saveProject, { listPath: "/admin/projects", arrays: ["technologyIds", "galleryAssetIds"] });
}
export async function saveTechnology(_: FormState, fd: FormData) {
  return handleSave(fd, technologySchema, content.saveTechnology, { listPath: "/admin/technologies" });
}
export async function saveExperience(_: FormState, fd: FormData) {
  return handleSave(fd, experienceSchema, content.saveExperience, { listPath: "/admin/experience" });
}
export async function saveEducation(_: FormState, fd: FormData) {
  return handleSave(fd, educationSchema, content.saveEducation, { listPath: "/admin/education" });
}
export async function saveCertification(_: FormState, fd: FormData) {
  return handleSave(fd, certificationSchema, content.saveCertification, { listPath: "/admin/certifications" });
}
export async function saveSkill(_: FormState, fd: FormData) {
  return handleSave(fd, skillSchema, content.saveSkill, { listPath: "/admin/skills" });
}
export async function saveMilestone(_: FormState, fd: FormData) {
  return handleSave(fd, milestoneSchema, content.saveMilestone, { listPath: "/admin/milestones" });
}
export async function saveSocialLink(_: FormState, fd: FormData) {
  return handleSave(fd, socialLinkSchema, content.saveSocialLink, { listPath: "/admin/social-links" });
}
export async function saveProfile(_: FormState, fd: FormData) {
  return handleSave(fd, profileSchema, (_id, data, actor) => content.saveProfile(data, actor), { listPath: "/admin/profile", singleton: true });
}
export async function saveSiteSettings(_: FormState, fd: FormData) {
  return handleSave(fd, siteSettingsSchema, (_id, data, actor) => content.saveSiteSettings(data, actor), { listPath: "/admin/settings", singleton: true });
}

// Record actions --------------------------------------------------------------

const DELETERS = {
  project: [content.deleteProject, "/admin/projects"],
  technology: [content.deleteTechnology, "/admin/technologies"],
  experience: [content.deleteExperience, "/admin/experience"],
  education: [content.deleteEducation, "/admin/education"],
  skill: [content.deleteSkill, "/admin/skills"],
  certification: [content.deleteCertification, "/admin/certifications"],
  milestone: [content.deleteMilestone, "/admin/milestones"],
  socialLink: [content.deleteSocialLink, "/admin/social-links"],
  media: [media.deleteAsset, "/admin/media"],
  message: [(id: string, actorId: string) => deleteMessageRecord(id, actorId), "/admin/messages"],
} as const;

export type DeletableEntity = keyof typeof DELETERS;

export async function deleteRecord(entity: DeletableEntity, id: string): Promise<FormState> {
  const entry = DELETERS[entity];
  if (!entry) return { message: "Unknown record type." };
  const [run, path] = entry;
  return handleRecordAction(id, run, path);
}

export async function setProjectStatus(id: string, status: "DRAFT" | "PUBLISHED"): Promise<FormState> {
  if (status !== "DRAFT" && status !== "PUBLISHED") return { message: "Invalid status." };
  return handleRecordAction(id, (rid, actor) => content.setProjectStatus(rid, status, actor), "/admin/projects");
}

// Messages ----------------------------------------------------------------------

async function deleteMessageRecord(id: string, actorId: string) {
  await prisma.contactMessage.delete({ where: { id } });
  await recordAudit({ actorId, action: "delete", entityType: "ContactMessage", entityId: id });
}

export async function deleteAllMessages(): Promise<FormState> {
  const admin = await requireAdmin();
  try {
    const { count } = await prisma.contactMessage.deleteMany({});
    await recordAudit({ actorId: admin.id, action: "delete", entityType: "ContactMessage", metadata: { scope: "all", count } });
  } catch (e) {
    return { message: toSafeMessage(e, "admin:messages:delete-all") };
  }
  revalidatePath("/admin/messages");
  return { ok: true };
}

export async function setMessageStatus(id: string, status: string): Promise<FormState> {
  const parsed = messageStatusSchema.safeParse(status);
  if (!parsed.success) return { message: "Invalid status." };
  return handleRecordAction(
    id,
    async (rid, actorId) => {
      await prisma.contactMessage.update({ where: { id: rid }, data: { status: parsed.data } });
      await recordAudit({ actorId, action: "status", entityType: "ContactMessage", entityId: rid, metadata: { status: parsed.data } });
    },
    "/admin/messages",
  );
}

// Media ---------------------------------------------------------------------------

async function uploadAllowed(adminId: string) {
  return consumeRateLimit(`upload:${adminId}`, RATE_LIMITS.upload);
}

export async function uploadMedia(_: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const meta = mediaMetaSchema.safeParse({ altText: fd.get("altText") ?? "" });
  if (!meta.success) return { errors: toFieldErrors(meta.error), message: "Please fix the highlighted fields." };
  const file = fd.get("file");
  if (!(file instanceof File)) return { errors: { file: "Choose a file to upload." } };
  try {
    if (!(await uploadAllowed(admin.id))) return { message: "Upload limit reached. Try again in a few minutes." };
    await media.uploadAsset(file, meta.data.altText, admin.id);
  } catch (e) {
    return { message: toSafeMessage(e, "admin:media:upload") };
  }
  revalidatePath("/admin/media");
  return { ok: true, message: "Uploaded." };
}

export async function replaceMedia(_: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const id = idSchema.safeParse(fd.get("id"));
  const file = fd.get("file");
  if (!id.success || !(file instanceof File)) return { message: "Choose a file to upload." };
  try {
    if (!(await uploadAllowed(admin.id))) return { message: "Upload limit reached. Try again in a few minutes." };
    await media.replaceAsset(id.data, file, admin.id);
  } catch (e) {
    return { message: toSafeMessage(e, "admin:media:replace") };
  }
  revalidatePath("/admin/media");
  return { ok: true, message: "Replaced." };
}

export async function updateMediaAlt(_: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const id = idSchema.safeParse(fd.get("id"));
  const meta = mediaMetaSchema.safeParse({ altText: fd.get("altText") ?? "" });
  if (!id.success || !meta.success) return { message: "Invalid input." };
  try {
    await media.updateAssetAlt(id.data, meta.data.altText, admin.id);
  } catch (e) {
    return { message: toSafeMessage(e, "admin:media:alt") };
  }
  revalidatePath("/admin/media");
  return { ok: true, message: "Saved." };
}

// Administrators -------------------------------------------------------------------

export async function addAdmin(_: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = adminUserSchema.safeParse({ email: fd.get("email"), name: fd.get("name") });
  if (!parsed.success) return { errors: toFieldErrors(parsed.error), message: "Please fix the highlighted fields." };
  try {
    const user = await prisma.user.upsert({ where: { email: parsed.data.email }, update: { isActive: true }, create: parsed.data });
    await recordAudit({ actorId: admin.id, action: "create", entityType: "User", entityId: user.id, metadata: { email: user.email } });
  } catch (e) {
    return { message: toSafeMessage(e, "admin:users:add") };
  }
  revalidatePath("/admin/users");
  return { ok: true, message: "Administrator allowed. They can now sign in with Google." };
}

export async function setAdminActive(id: string, isActive: boolean): Promise<FormState> {
  const admin = await requireAdmin();
  if (id === admin.id) return { message: "You cannot deactivate your own account." };
  return handleRecordAction(
    id,
    async (rid, actorId) => {
      await prisma.user.update({ where: { id: rid }, data: { isActive: Boolean(isActive) } });
      await recordAudit({ actorId, action: isActive ? "activate" : "deactivate", entityType: "User", entityId: rid });
    },
    "/admin/users",
  );
}

// Session -----------------------------------------------------------------------------

export async function signOutAction() {
  await signOut({ redirect: false });
  redirect("/admin/login?signedOut=1");
}
