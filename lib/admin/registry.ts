import "server-only";
import type { ContentStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { LANDMARK_LABELS, LANDMARKS } from "@/lib/roadmap/landmarks";
import { formatYearRange, toDateInput } from "@/lib/format";
import { mediaUrl } from "@/lib/services/media";
import type { AssetOption, Field, RouteStop, Values } from "@/components/admin/fields";
import type { FormState } from "./form-state";
import * as actions from "@/app/admin/(panel)/actions";
import type { DeletableEntity } from "@/app/admin/(panel)/actions";

export type Row = { id: string; cells: (string | null)[]; status?: string; previewHref?: string };

export type EntityConfig = {
  title: string;
  singular: string;
  description: string;
  columns: string[];
  deleteKey: DeletableEntity;
  action: (s: FormState, fd: FormData) => Promise<FormState>;
  fields: () => Promise<Field[]>;
  list: (q: { search?: string; status?: string }) => Promise<Row[]>;
  load: (id: string) => Promise<Record<string, unknown> | null>;
  defaults: Values;
  needsAssets?: boolean;
  isMilestone?: boolean;
  publishable?: boolean;
};

const iso = (d: Date | null) => (d ? d.toISOString() : null);
const statusFilter = (status?: string): { status?: ContentStatus } => (status === "DRAFT" || status === "PUBLISHED" ? { status } : {});
const contains = (search?: string) => (search ? { contains: search, mode: "insensitive" as const } : undefined);
const order = { label: "Sort order", name: "sortOrder", type: "number", help: "Lower numbers appear first." } as const;

export const ENTITIES: Record<string, EntityConfig> = {
  projects: {
    title: "Projects",
    singular: "project",
    description: "Portfolio case studies. Only published projects are public; featured ones appear on the home page.",
    columns: ["Title", "Type", "Featured", "Updated"],
    deleteKey: "project",
    action: actions.saveProject,
    needsAssets: true,
    publishable: true,
    defaults: { status: "DRAFT", sortOrder: "0", featured: false },
    fields: async () => {
      const [techs, images] = await Promise.all([
        prisma.technology.findMany({ orderBy: { name: "asc" } }),
        // ponytail: gallery order = upload order (oldest first); add drag-to-reorder if that proves too rigid.
        prisma.mediaAsset.findMany({ where: { mimeType: { startsWith: "image/" } }, orderBy: { createdAt: "asc" }, select: { id: true, fileName: true, altText: true, objectKey: true } }),
      ]);
      return [
        { name: "title", label: "Title", type: "text", required: true },
        { name: "slug", label: "Slug", type: "text", required: true, help: "URL: /projects/<slug>. Lowercase letters, numbers and hyphens." },
        { name: "projectType", label: "Type", type: "text", required: true, placeholder: "Full Stack Web Application" },
        { name: "status", label: "Status", type: "status" },
        { name: "shortDescription", label: "Short description", type: "textarea", required: true, rows: 2 },
        { name: "description", label: "Overview", type: "textarea", required: true, rows: 6 },
        { name: "problemStatement", label: "Problem", type: "textarea" },
        { name: "solution", label: "Solution", type: "textarea" },
        { name: "role", label: "Your role", type: "text" },
        { name: "startDate", label: "Start date", type: "date" },
        { name: "endDate", label: "End date", type: "date" },
        { name: "repositoryUrl", label: "Repository URL", type: "url" },
        { name: "liveUrl", label: "Live demo URL", type: "url" },
        { name: "coverAssetId", label: "Cover image", type: "asset", accept: "image" },
        { name: "technologyIds", label: "Technologies", type: "multiselect", options: techs.map((t) => ({ value: t.id, label: t.name })), help: "Manage the list under Technologies." },
        {
          name: "galleryAssetIds",
          label: "Gallery images",
          type: "multiselect",
          options: images.map((a) => ({ value: a.id, label: a.altText || a.fileName, thumb: mediaUrl(a.objectKey) })),
          help: "Screenshots and documentation shown after the cover in the project page carousel. They appear in upload order; upload them in Media first.",
        },
        order,
        { name: "featured", label: "Feature on the home page", type: "checkbox" },
      ];
    },
    list: async ({ search, status }) =>
      (
        await prisma.project.findMany({
          where: { ...statusFilter(status), ...(search ? { OR: [{ title: contains(search) }, { slug: contains(search) }] } : {}) },
          orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
        })
      ).map((p) => ({ id: p.id, status: p.status, previewHref: `/projects/${p.slug}?preview=1`, cells: [p.title, p.projectType, p.featured ? "Yes" : "", p.updatedAt.toISOString().slice(0, 10)] })),
    load: async (id) => {
      const p = await prisma.project.findUnique({ where: { id }, include: { technologies: true, gallery: { orderBy: { sortOrder: "asc" } } } });
      return (
        p && {
          ...p,
          startDate: toDateInput(p.startDate),
          endDate: toDateInput(p.endDate),
          sortOrder: String(p.sortOrder),
          technologyIds: p.technologies.map((t) => t.technologyId),
          galleryAssetIds: p.gallery.map((g) => g.assetId),
        }
      );
    },
  },
  technologies: {
    title: "Technologies",
    singular: "technology",
    description: "Tags attached to projects. A technology in use by a project cannot be deleted.",
    columns: ["Name", "Category", "Projects"],
    deleteKey: "technology",
    action: actions.saveTechnology,
    defaults: {},
    fields: async () => [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "slug", label: "Slug", type: "text", required: true },
      { name: "category", label: "Category", type: "text" },
      { name: "icon", label: "Icon name (optional)", type: "text" },
    ],
    list: async ({ search }) =>
      (await prisma.technology.findMany({ where: search ? { name: contains(search) } : {}, orderBy: { name: "asc" }, include: { _count: { select: { projects: true } } } })).map((t) => ({
        id: t.id,
        cells: [t.name, t.category, String(t._count.projects)],
      })),
    load: async (id) => prisma.technology.findUnique({ where: { id } }),
  },
  milestones: {
    title: "Milestones",
    singular: "milestone",
    description: "Stops on the interactive journey map. Click the road to place a stop; order on the map follows the position.",
    columns: ["Title", "Category", "Position", "Dates"],
    deleteKey: "milestone",
    action: actions.saveMilestone,
    needsAssets: true,
    isMilestone: true,
    publishable: true,
    defaults: { status: "DRAFT", sortOrder: "0", routePosition: "0.5", landmark: "flag" },
    fields: async () => {
      const [projects, experiences] = await Promise.all([
        prisma.project.findMany({ orderBy: { title: "asc" }, select: { id: true, title: true, status: true } }),
        prisma.experience.findMany({ orderBy: { organization: "asc" }, select: { id: true, organization: true, position: true } }),
      ]);
      return [
        { name: "title", label: "Title", type: "text", required: true },
        { name: "slug", label: "Slug", type: "text", required: true },
        { name: "category", label: "Kicker / category", type: "text", required: true, placeholder: "Education" },
        { name: "status", label: "Status", type: "status" },
        { name: "landmark", label: "Landmark on the map", type: "select", allowEmpty: false, options: LANDMARKS.map((l) => ({ value: l, label: LANDMARK_LABELS[l] })) },
        { name: "routePosition", label: "Position on the road", type: "route", help: "0 is the start of the road, 1 the end. Click the road or drag the slider." },
        { name: "shortDescription", label: "Card text", type: "textarea", required: true, rows: 2 },
        { name: "description", label: "Long description (list view)", type: "textarea" },
        { name: "tags", label: "Tags", type: "tags", help: "Comma separated, up to 8." },
        { name: "startDate", label: "Start date", type: "date" },
        { name: "endDate", label: "End date", type: "date" },
        { name: "locationLabel", label: "Location", type: "text" },
        { name: "imageAssetId", label: "Image", type: "asset", accept: "image" },
        { name: "relatedProjectId", label: "Linked project", type: "select", options: projects.map((p) => ({ value: p.id, label: `${p.title}${p.status === "DRAFT" ? " (draft, link hidden)" : ""}` })) },
        { name: "relatedExperienceId", label: "Linked experience", type: "select", options: experiences.map((e) => ({ value: e.id, label: `${e.position}, ${e.organization}` })) },
        order,
      ];
    },
    list: async ({ search, status }) =>
      (await prisma.milestone.findMany({ where: { ...statusFilter(status), ...(search ? { title: contains(search) } : {}) }, orderBy: [{ routePosition: "asc" }] })).map((m) => ({
        id: m.id,
        status: m.status,
        previewHref: "/#journey",
        cells: [m.title, m.category, `${Math.round(m.routePosition * 100)}%`, formatYearRange(iso(m.startDate), iso(m.endDate))],
      })),
    load: async (id) => {
      const m = await prisma.milestone.findUnique({ where: { id } });
      return m && { ...m, startDate: toDateInput(m.startDate), endDate: toDateInput(m.endDate), sortOrder: String(m.sortOrder), routePosition: String(m.routePosition) };
    },
  },
  experience: {
    title: "Experience",
    singular: "experience entry",
    description: "Work history shown in the Experience timeline.",
    columns: ["Organization", "Position", "Dates"],
    deleteKey: "experience",
    action: actions.saveExperience,
    publishable: true,
    defaults: { status: "DRAFT", sortOrder: "0", isCurrent: false },
    fields: async () => [
      { name: "organization", label: "Organization", type: "text", required: true },
      { name: "position", label: "Position", type: "text", required: true },
      { name: "employmentType", label: "Employment type", type: "text", placeholder: "Internship" },
      { name: "location", label: "Location", type: "text" },
      { name: "status", label: "Status", type: "status" },
      { name: "startDate", label: "Start date", type: "date" },
      { name: "endDate", label: "End date", type: "date" },
      { name: "isCurrent", label: "I currently work here", type: "checkbox" },
      { name: "description", label: "Description", type: "textarea" },
      { name: "achievements", label: "Achievements", type: "lines", help: "One per line." },
      order,
    ],
    list: async ({ status }) =>
      (await prisma.experience.findMany({ where: statusFilter(status), orderBy: [{ sortOrder: "asc" }, { startDate: "desc" }] })).map((e) => ({
        id: e.id,
        status: e.status,
        cells: [e.organization, e.position, formatYearRange(iso(e.startDate), iso(e.endDate), e.isCurrent)],
      })),
    load: async (id) => {
      const e = await prisma.experience.findUnique({ where: { id } });
      return e && { ...e, startDate: toDateInput(e.startDate), endDate: toDateInput(e.endDate), sortOrder: String(e.sortOrder) };
    },
  },
  education: {
    title: "Education",
    singular: "education entry",
    description: "Shown in the Experience timeline after work history.",
    columns: ["Institution", "Degree", "Dates"],
    deleteKey: "education",
    action: actions.saveEducation,
    publishable: true,
    defaults: { status: "DRAFT", sortOrder: "0", isCurrent: false },
    fields: async () => [
      { name: "institution", label: "Institution", type: "text", required: true },
      { name: "degree", label: "Degree", type: "text" },
      { name: "fieldOfStudy", label: "Field of study", type: "text" },
      { name: "gpa", label: "GPA", type: "text", placeholder: "3.85 / 4.00", help: "Optional. Shown as “GPA 3.85 / 4.00”; leave empty to hide it." },
      { name: "location", label: "Location", type: "text" },
      { name: "status", label: "Status", type: "status" },
      { name: "startDate", label: "Start date", type: "date" },
      { name: "endDate", label: "End date", type: "date" },
      { name: "isCurrent", label: "Currently studying", type: "checkbox" },
      { name: "description", label: "Description", type: "textarea" },
      order,
    ],
    list: async ({ status }) =>
      (await prisma.education.findMany({ where: statusFilter(status), orderBy: [{ sortOrder: "asc" }, { startDate: "desc" }] })).map((e) => ({
        id: e.id,
        status: e.status,
        cells: [e.institution, [e.degree, e.fieldOfStudy].filter(Boolean).join(", "), formatYearRange(iso(e.startDate), iso(e.endDate), e.isCurrent)],
      })),
    load: async (id) => {
      const e = await prisma.education.findUnique({ where: { id } });
      return e && { ...e, startDate: toDateInput(e.startDate), endDate: toDateInput(e.endDate), sortOrder: String(e.sortOrder) };
    },
  },
  certifications: {
    title: "Certifications",
    singular: "certification",
    description: "Credentials shown in the Certifications section. Add a verification link where the issuer offers one.",
    columns: ["Name", "Issuer", "Issued"],
    deleteKey: "certification",
    action: actions.saveCertification,
    needsAssets: true,
    publishable: true,
    defaults: { status: "DRAFT", sortOrder: "0" },
    fields: async () => [
      { name: "name", label: "Name", type: "text", required: true, placeholder: "AWS Certified Cloud Practitioner" },
      { name: "issuer", label: "Issuer", type: "text", required: true, placeholder: "Amazon Web Services" },
      { name: "status", label: "Status", type: "status" },
      { name: "issueDate", label: "Issue date", type: "date" },
      { name: "expiryDate", label: "Expiry date", type: "date", help: "Leave empty if it does not expire." },
      { name: "credentialId", label: "Credential ID", type: "text" },
      { name: "credentialUrl", label: "Verification URL", type: "url" },
      { name: "description", label: "Note", type: "textarea", rows: 2 },
      { name: "imageAssetId", label: "Certificate file (image or PDF)", type: "asset", accept: "any", help: "Visitors get a \u201cView certificate\u201d button: images open in a preview, PDFs open in the browser." },
      order,
    ],
    list: async ({ search, status }) =>
      (await prisma.certification.findMany({ where: { ...statusFilter(status), ...(search ? { name: contains(search) } : {}) }, orderBy: [{ sortOrder: "asc" }, { issueDate: "desc" }] })).map((c) => ({
        id: c.id,
        status: c.status,
        cells: [c.name, c.issuer, formatYearRange(iso(c.issueDate), null)],
      })),
    load: async (id) => {
      const c = await prisma.certification.findUnique({ where: { id } });
      return c && { ...c, issueDate: toDateInput(c.issueDate), expiryDate: toDateInput(c.expiryDate), sortOrder: String(c.sortOrder) };
    },
  },
  skills: {
    title: "Skills",
    singular: "skill",
    description: "Grouped by category in the About section. No proficiency ratings.",
    columns: ["Name", "Category"],
    deleteKey: "skill",
    action: actions.saveSkill,
    publishable: true,
    defaults: { status: "PUBLISHED", sortOrder: "0" },
    fields: async () => [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "category", label: "Category", type: "text", required: true, placeholder: "Languages" },
      { name: "status", label: "Status", type: "status" },
      { name: "description", label: "Note (shown on hover)", type: "text" },
      order,
    ],
    list: async ({ search, status }) =>
      (await prisma.skill.findMany({ where: { ...statusFilter(status), ...(search ? { name: contains(search) } : {}) }, orderBy: [{ category: "asc" }, { sortOrder: "asc" }] })).map((s) => ({
        id: s.id,
        status: s.status,
        cells: [s.name, s.category],
      })),
    load: async (id) => {
      const s = await prisma.skill.findUnique({ where: { id } });
      return s && { ...s, sortOrder: String(s.sortOrder) };
    },
  },
  "social-links": {
    title: "Social links",
    singular: "social link",
    description: "Shown in the Contact section. http(s) or mailto: links only.",
    columns: ["Platform", "Label", "Visible"],
    deleteKey: "socialLink",
    action: actions.saveSocialLink,
    defaults: { isVisible: true, sortOrder: "0" },
    fields: async () => [
      { name: "platform", label: "Platform", type: "text", required: true, placeholder: "GitHub" },
      { name: "label", label: "Label", type: "text", required: true, placeholder: "github.com/username" },
      { name: "url", label: "URL", type: "text", required: true, placeholder: "https://… or mailto:…" },
      { name: "icon", label: "Fallback icon text (max 4 chars)", type: "text", placeholder: "gh", help: "LinkedIn, GitHub and e-mail links get their logo automatically; this text is used for other sites." },
      order,
      { name: "isVisible", label: "Visible on the site", type: "checkbox" },
    ],
    list: async () =>
      (await prisma.socialLink.findMany({ orderBy: [{ sortOrder: "asc" }] })).map((s) => ({ id: s.id, cells: [s.platform, s.label, s.isVisible ? "Yes" : "Hidden"] })),
    load: async (id) => {
      const s = await prisma.socialLink.findUnique({ where: { id } });
      return s && { ...s, sortOrder: String(s.sortOrder) };
    },
  },
};

export async function assetOptions(): Promise<AssetOption[]> {
  const assets = await prisma.mediaAsset.findMany({ orderBy: { createdAt: "desc" }, select: { id: true, fileName: true, objectKey: true, mimeType: true, altText: true } });
  return assets.map((a) => ({ id: a.id, label: a.altText ? `${a.fileName} — ${a.altText}` : a.fileName, url: mediaUrl(a.objectKey), isImage: a.mimeType.startsWith("image/") }));
}

export async function routeStops(): Promise<RouteStop[]> {
  const ms = await prisma.milestone.findMany({ orderBy: { routePosition: "asc" }, select: { id: true, title: true, routePosition: true } });
  return ms.map((m) => ({ id: m.id, title: m.title, position: m.routePosition }));
}

/** Flattens a record to form values: dates/numbers become strings, relations are dropped. */
export function toValues(record: Record<string, unknown>): Values {
  const out: Values = {};
  for (const [k, v] of Object.entries(record)) {
    if (v === null || typeof v === "string" || typeof v === "boolean") out[k] = v;
    else if (typeof v === "number") out[k] = String(v);
    else if (v instanceof Date) out[k] = v.toISOString();
    else if (Array.isArray(v) && v.every((x) => typeof x === "string")) out[k] = v;
  }
  return out;
}
