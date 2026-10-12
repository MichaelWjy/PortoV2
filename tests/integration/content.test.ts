import { beforeEach, describe, expect, it, vi } from "vitest";

// Outside a Next.js request there is no incremental cache: run cached reads directly and record invalidations.
const revalidateTag = vi.fn();
vi.mock("next/cache", () => ({
  unstable_cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
  revalidateTag: (...args: unknown[]) => revalidateTag(...args),
  revalidatePath: vi.fn(),
}));

import { prisma } from "@/lib/db";
import * as content from "@/lib/services/content";
import { getHomeContent, getPublishedProject, getPublishedProjects } from "@/lib/services/public";
import { PUBLIC_CONTENT_TAG } from "@/lib/services/cache";
import { certificationSchema, milestoneSchema, projectSchema } from "@/lib/validation/schemas";
import { createAdmin, resetDatabase } from "../support/db";

let actor: string;
const projectInput = (over: Record<string, unknown> = {}) =>
  projectSchema.parse({ title: "BizBridge", slug: "bizbridge", projectType: "Web", shortDescription: "s", description: "d", status: "DRAFT", featured: "on", ...over });

beforeEach(async () => {
  await resetDatabase();
  actor = (await createAdmin()).id;
  revalidateTag.mockClear();
});

describe("project publication lifecycle", () => {
  it("keeps drafts out of every public read", async () => {
    await content.saveProject(null, projectInput(), actor);
    expect(await getPublishedProjects()).toEqual([]);
    expect(await getPublishedProject("bizbridge")).toBeNull();
    expect((await getHomeContent()).projects).toEqual([]);
  });

  it("publishes, records the audit trail, sets publishedAt and invalidates the public cache", async () => {
    const p = await content.saveProject(null, projectInput(), actor);
    await content.setProjectStatus(p.id, "PUBLISHED", actor);

    const pub = await getPublishedProject("bizbridge");
    expect(pub?.title).toBe("BizBridge");
    expect(pub?.publishedAt).not.toBeNull();
    expect((await getHomeContent()).projects.map((x) => x.slug)).toEqual(["bizbridge"]);
    expect(revalidateTag).toHaveBeenCalledWith(PUBLIC_CONTENT_TAG, { expire: 0 });

    const actions = (await prisma.auditLog.findMany({ where: { entityId: p.id }, orderBy: { createdAt: "asc" } })).map((l) => l.action);
    expect(actions).toEqual(["create", "publish"]);
  });

  it("unpublishing removes the project from public listings", async () => {
    const p = await content.saveProject(null, projectInput({ status: "PUBLISHED" }), actor);
    await content.setProjectStatus(p.id, "DRAFT", actor);
    expect(await getPublishedProjects()).toEqual([]);
    expect((await prisma.project.findUnique({ where: { id: p.id } }))?.publishedAt).toBeNull();
  });

  it("replaces technology links on update", async () => {
    const [a, b] = await Promise.all([
      content.saveTechnology(null, { name: "Next.js", slug: "nextjs", category: null, icon: null }, actor),
      content.saveTechnology(null, { name: "Go", slug: "go", category: null, icon: null }, actor),
    ]);
    const p = await content.saveProject(null, projectInput({ technologyIds: [a.id] }), actor);
    await content.saveProject(p.id, projectInput({ technologyIds: [b.id, b.id] }), actor);
    const links = await prisma.projectTechnology.findMany({ where: { projectId: p.id } });
    expect(links.map((l) => l.technologyId)).toEqual([b.id]);
  });

  it("refuses to delete a technology still used by a project", async () => {
    const t = await content.saveTechnology(null, { name: "Go", slug: "go", category: null, icon: null }, actor);
    await content.saveProject(null, projectInput({ technologyIds: [t.id] }), actor);
    await expect(content.deleteTechnology(t.id, actor)).rejects.toMatchObject({ code: "P2003" });
  });

  it("rejects duplicate slugs", async () => {
    await content.saveProject(null, projectInput(), actor);
    await expect(content.saveProject(null, projectInput(), actor)).rejects.toMatchObject({ code: "P2002" });
  });
});

describe("milestones", () => {
  const milestone = (over: Record<string, unknown> = {}) =>
    milestoneSchema.parse({ title: "Internship", slug: "internship", category: "Work", shortDescription: "s", status: "PUBLISHED", routePosition: "0.5", ...over });

  it("only publishes published milestones, ordered by road position", async () => {
    await content.saveMilestone(null, milestone({ slug: "b", title: "B", routePosition: "0.8" }), actor);
    await content.saveMilestone(null, milestone({ slug: "a", title: "A", routePosition: "0.2" }), actor);
    await content.saveMilestone(null, milestone({ slug: "c", title: "Hidden", status: "DRAFT" }), actor);
    expect((await getHomeContent()).milestones.map((m) => m.title)).toEqual(["A", "B"]);
  });

  it("links a related project only while that project is public", async () => {
    const p = await content.saveProject(null, projectInput(), actor);
    await content.saveMilestone(null, milestone({ relatedProjectId: p.id }), actor);
    expect((await getHomeContent()).milestones[0].project).toBeNull();
    await content.setProjectStatus(p.id, "PUBLISHED", actor);
    expect((await getHomeContent()).milestones[0].project).toEqual({ slug: "bizbridge", title: "BizBridge" });
  });

  it("keeps the milestone when its related project is deleted, and the project when the milestone is deleted", async () => {
    const p = await content.saveProject(null, projectInput(), actor);
    const m = await content.saveMilestone(null, milestone({ relatedProjectId: p.id }), actor);
    await content.deleteProject(p.id, actor);
    expect((await prisma.milestone.findUnique({ where: { id: m.id } }))?.relatedProjectId).toBeNull();

    const p2 = await content.saveProject(null, projectInput({ slug: "other" }), actor);
    const m2 = await content.saveMilestone(null, milestone({ slug: "m2", relatedProjectId: p2.id }), actor);
    await content.deleteMilestone(m2.id, actor);
    expect(await prisma.project.findUnique({ where: { id: p2.id } })).not.toBeNull();
  });

  it("rejects a link to a project that does not exist", async () => {
    await expect(content.saveMilestone(null, milestone({ relatedProjectId: "ckxxxxxxxxxxxxxxxxxxxxxxx" }), actor)).rejects.toMatchObject({ code: "P2003" });
  });
});

describe("experience", () => {
  it("clears the end date of a current role", async () => {
    const e = await content.saveExperience(
      null,
      { organization: "BCA", position: "Intern", employmentType: null, location: null, description: null, achievements: [], startDate: new Date("2026-01-01"), endDate: new Date("2026-06-01"), isCurrent: true, status: "PUBLISHED", sortOrder: 0 },
      actor,
    );
    expect(e.endDate).toBeNull();
    expect((await getHomeContent()).timeline[0].period).toBe("2026 – Present");
  });

  it("keeps education in its own section, out of the work timeline", async () => {
    await content.saveEducation(
      null,
      { institution: "BINUS University", degree: "Bachelor", fieldOfStudy: "Computer Science", gpa: "3.85 / 4.00", location: null, description: null, startDate: null, endDate: null, isCurrent: true, status: "PUBLISHED", sortOrder: 0 },
      actor,
    );
    const home = await getHomeContent();
    expect(home.timeline).toHaveLength(0);
    expect(home.education.map((e) => [e.title, e.subtitle])).toEqual([["BINUS University", "Bachelor, Computer Science · GPA 3.85 / 4.00"]]);
  });
});

describe("certifications", () => {
  const cert = (over: Record<string, unknown> = {}) =>
    certificationSchema.parse({ name: "Cloud Practitioner", issuer: "AWS", status: "PUBLISHED", issueDate: "2024-03-01", ...over });

  it("shows only published certifications and flags expired ones", async () => {
    await content.saveCertification(null, cert(), actor);
    await content.saveCertification(null, cert({ name: "Old", expiryDate: "2024-12-31" }), actor);
    await content.saveCertification(null, cert({ name: "Hidden", status: "DRAFT" }), actor);
    const list = (await getHomeContent()).certifications;
    expect(list.map((c) => c.name).sort()).toEqual(["Cloud Practitioner", "Old"]);
    expect(list.find((c) => c.name === "Old")?.expired).toBe(true);
    expect(list.find((c) => c.name === "Cloud Practitioner")?.issued).toBe("2024");
  });

  it("rejects an expiry before the issue date and non-http verification links", () => {
    expect(certificationSchema.safeParse({ name: "x", issuer: "y", status: "DRAFT", issueDate: "2024-03-01", expiryDate: "2023-01-01" }).success).toBe(false);
    expect(certificationSchema.safeParse({ name: "x", issuer: "y", status: "DRAFT", credentialUrl: "javascript:alert(1)" }).success).toBe(false);
  });
});
