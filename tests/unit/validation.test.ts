import { describe, expect, it } from "vitest";
import { contactSchema, milestoneSchema, projectSchema, socialLinkSchema, toFieldErrors } from "@/lib/validation/schemas";

const project = {
  title: "BizBridge",
  slug: "bizbridge",
  projectType: "Web app",
  shortDescription: "Short",
  description: "Long",
  status: "DRAFT",
};

describe("project schema", () => {
  it("accepts a minimal project and normalises empty optionals to null", () => {
    const p = projectSchema.parse({ ...project, repositoryUrl: "", role: "  ", featured: "on" });
    expect(p.repositoryUrl).toBeNull();
    expect(p.role).toBeNull();
    expect(p.featured).toBe(true);
    expect(p.technologyIds).toEqual([]);
  });

  it.each(["Biz Bridge", "biz--bridge", "-biz", "BIZ", "a/b"])("rejects slug %s", (slug) => {
    expect(projectSchema.safeParse({ ...project, slug }).success).toBe(false);
  });

  it.each(["javascript:alert(1)", "ftp://x.com", "data:text/html,hi"])("rejects unsafe URL %s", (url) => {
    expect(projectSchema.safeParse({ ...project, liveUrl: url }).success).toBe(false);
  });

  it("rejects an end date before the start date", () => {
    const r = projectSchema.safeParse({ ...project, startDate: "2025-05-01", endDate: "2024-01-01" });
    expect(r.success).toBe(false);
    if (!r.success) expect(toFieldErrors(r.error).endDate).toMatch(/after/);
  });

  it("rejects unknown statuses (no client-supplied lifecycle states)", () => {
    expect(projectSchema.safeParse({ ...project, status: "ARCHIVED" }).success).toBe(false);
  });

  it("strips fields that are not part of the schema (no mass assignment)", () => {
    const p = projectSchema.parse({ ...project, publishedAt: "2020-01-01", id: "x" }) as Record<string, unknown>;
    expect(p.publishedAt).toBeUndefined();
    expect(p.id).toBeUndefined();
  });
});

describe("milestone schema", () => {
  const base = { title: "BINUS", slug: "binus", category: "Education", shortDescription: "x", status: "PUBLISHED", routePosition: "0.4", tags: "a, b, , c" };
  it("parses route position and tags", () => {
    const m = milestoneSchema.parse(base);
    expect(m.routePosition).toBe(0.4);
    expect(m.tags).toEqual(["a", "b", "c"]);
  });
  it.each(["-0.1", "1.01", "abc"])("rejects position %s", (routePosition) => {
    expect(milestoneSchema.safeParse({ ...base, routePosition }).success).toBe(false);
  });
});

describe("social link schema", () => {
  it("accepts https and mailto links only", () => {
    const base = { platform: "x", label: "x" };
    expect(socialLinkSchema.safeParse({ ...base, url: "mailto:me@example.com" }).success).toBe(true);
    expect(socialLinkSchema.safeParse({ ...base, url: "https://github.com/me" }).success).toBe(true);
    expect(socialLinkSchema.safeParse({ ...base, url: "javascript:alert(1)" }).success).toBe(false);
  });
});

describe("contact schema", () => {
  it("requires name, valid e-mail and a real message", () => {
    const r = contactSchema.safeParse({ name: "", email: "nope", message: "hi" });
    expect(r.success).toBe(false);
    if (!r.success) expect(Object.keys(toFieldErrors(r.error)).sort()).toEqual(["email", "message", "name"]);
  });
  it("limits message length", () => {
    expect(contactSchema.safeParse({ name: "A", email: "a@b.co", message: "x".repeat(5001) }).success).toBe(false);
  });
});
