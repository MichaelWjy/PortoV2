import { z } from "zod";
import { LANDMARKS } from "@/lib/roadmap/landmarks";

// Form inputs arrive as strings. Empty strings become null so optional fields can be cleared.
const emptyToNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);

const text = (max: number) => z.string().trim().min(1, "Required").max(max, `At most ${max} characters`);
const optionalText = (max: number) =>
  z.preprocess(emptyToNull, z.string().trim().max(max, `At most ${max} characters`).nullable()).default(null);

export const safeUrl = z
  .string()
  .trim()
  .max(500)
  .url("Must be a valid URL")
  .refine((v) => /^https?:\/\//i.test(v), "Only http and https links are allowed");

const optionalUrl = z.preprocess(emptyToNull, safeUrl.nullable()).default(null);

/** Accepts http(s) URLs and mailto: links (for e-mail social links). */
export const linkUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => /^https?:\/\/[^\s]+$/i.test(v) || /^mailto:[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(v), "Must be an http(s) or mailto: link");

export const slug = z
  .string()
  .trim()
  .min(1, "Required")
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Lowercase letters, numbers and single hyphens only");

const optionalDate = z
  .preprocess(emptyToNull, z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD").nullable())
  .transform((v) => (v ? new Date(`${v}T00:00:00.000Z`) : null))
  .default(null);

const checkbox = z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean());
const sortOrder = z.coerce.number().int().min(-10000).max(10000).default(0);
const status = z.enum(["DRAFT", "PUBLISHED"]);
const id = z.string().regex(/^[a-z0-9]{20,40}$/i, "Invalid id");
const optionalId = z.preprocess(emptyToNull, id.nullable()).default(null);

/** One item per line, blanks dropped. */
const lines = (maxItems: number, maxLen: number) =>
  z
    .preprocess(
      (v) => (typeof v === "string" ? v.split(/\r?\n/).map((s) => s.trim()).filter(Boolean) : v ?? []),
      z.array(z.string().max(maxLen)).max(maxItems),
    )
    .default([]);

/** Comma-separated, blanks dropped. */
const commaList = (maxItems: number, maxLen: number) =>
  z
    .preprocess(
      (v) => (typeof v === "string" ? v.split(",").map((s) => s.trim()).filter(Boolean) : v ?? []),
      z.array(z.string().max(maxLen)).max(maxItems),
    )
    .default([]);

const dateRange = <T extends { startDate: Date | null; endDate: Date | null }>(v: T, ctx: z.RefinementCtx) => {
  if (v.startDate && v.endDate && v.endDate < v.startDate) {
    ctx.addIssue({ code: "custom", path: ["endDate"], message: "End date must be after the start date" });
  }
};

export const idSchema = id;

export const projectSchema = z
  .object({
    title: text(120),
    slug,
    projectType: text(80),
    shortDescription: text(300),
    description: text(10000),
    problemStatement: optionalText(5000),
    solution: optionalText(5000),
    role: optionalText(200),
    startDate: optionalDate,
    endDate: optionalDate,
    repositoryUrl: optionalUrl,
    liveUrl: optionalUrl,
    coverAssetId: optionalId,
    featured: checkbox,
    status,
    sortOrder,
    technologyIds: z.array(id).max(50).default([]),
    galleryAssetIds: z.array(id).max(20).default([]),
  })
  .superRefine(dateRange);

export const technologySchema = z.object({
  name: text(60),
  slug,
  category: optionalText(60),
  icon: optionalText(60),
});

export const experienceSchema = z
  .object({
    organization: text(120),
    position: text(120),
    employmentType: optionalText(60),
    location: optionalText(120),
    description: optionalText(5000),
    achievements: lines(20, 300),
    startDate: optionalDate,
    endDate: optionalDate,
    isCurrent: checkbox,
    status,
    sortOrder,
  })
  .superRefine(dateRange);

export const educationSchema = z
  .object({
    institution: text(120),
    degree: optionalText(120),
    fieldOfStudy: optionalText(120),
    gpa: optionalText(20),
    location: optionalText(120),
    description: optionalText(5000),
    startDate: optionalDate,
    endDate: optionalDate,
    isCurrent: checkbox,
    status,
    sortOrder,
  })
  .superRefine(dateRange);

export const skillSchema = z.object({
  name: text(60),
  category: text(60),
  description: optionalText(300),
  status,
  sortOrder,
});

export const milestoneSchema = z
  .object({
    title: text(80),
    slug,
    category: text(60),
    shortDescription: text(300),
    description: optionalText(5000),
    tags: commaList(8, 40),
    startDate: optionalDate,
    endDate: optionalDate,
    locationLabel: optionalText(80),
    landmark: z.enum(LANDMARKS).default("flag"),
    routePosition: z.coerce.number().min(0, "Must be between 0 and 1").max(1, "Must be between 0 and 1"),
    relatedProjectId: optionalId,
    relatedExperienceId: optionalId,
    imageAssetId: optionalId,
    status,
    sortOrder,
  })
  .superRefine(dateRange);

export const certificationSchema = z
  .object({
    name: text(150),
    issuer: text(120),
    issueDate: optionalDate,
    expiryDate: optionalDate,
    credentialId: optionalText(120),
    credentialUrl: optionalUrl,
    description: optionalText(1000),
    imageAssetId: optionalId,
    status,
    sortOrder,
  })
  .superRefine((v, ctx) => {
    if (v.issueDate && v.expiryDate && v.expiryDate < v.issueDate) {
      ctx.addIssue({ code: "custom", path: ["expiryDate"], message: "Expiry must be after the issue date" });
    }
  });

export const socialLinkSchema = z.object({
  platform: text(40),
  label: text(120),
  url: linkUrl,
  icon: optionalText(4),
  sortOrder,
  isVisible: checkbox,
});

export const profileSchema = z.object({
  fullName: text(120),
  professionalTitle: text(120),
  location: text(120),
  shortBio: text(600),
  longBio: optionalText(5000),
  email: z.preprocess(emptyToNull, z.email("Must be a valid e-mail").max(200).nullable()).default(null),
  availabilityStatus: z.enum(["AVAILABLE", "LIMITED", "UNAVAILABLE"]),
  profileImageAssetId: optionalId,
  aboutImageAssetId: optionalId,
  resumeAssetId: optionalId,
});

const copy = (max = 300) => text(max);
export const siteSettingsSchema = z.object({
  navWorkLabel: copy(30),
  navAboutLabel: copy(30),
  navExperienceLabel: copy(30),
  navContactLabel: copy(30),
  availabilityLabel: copy(40),
  heroEyebrow: copy(80),
  heroHeadline: copy(80),
  heroDescription: copy(400),
  heroPrimaryCtaLabel: copy(40),
  heroSecondaryCtaLabel: copy(40),
  journeyEyebrow: copy(60),
  journeyHeadline: copy(80),
  journeyDescription: copy(400),
  projectsHeadline: copy(80),
  projectsDescription: copy(400),
  aboutHeadline: copy(80),
  skillsHeadline: copy(80),
  experienceHeadline: copy(80),
  educationHeadline: copy(80),
  certificationsHeadline: copy(80),
  contactHeadline: copy(80),
  contactDescription: copy(400),
  footerHeadline: copy(120),
  footerNote: copy(120),
  seoTitle: copy(70),
  seoDescription: copy(200),
});

export const mediaMetaSchema = z.object({ altText: z.string().trim().max(300).default("") });

export const messageStatusSchema = z.enum(["NEW", "READ", "ARCHIVED"]);

export const adminUserSchema = z.object({
  email: z.email("Must be a valid e-mail").max(200).transform((v) => v.toLowerCase()),
  name: optionalText(120),
});

export const contactSchema = z.object({
  name: text(100),
  email: z.email("Please enter a valid e-mail address").max(200),
  subject: optionalText(150),
  message: z.string().trim().min(10, "Please write at least 10 characters").max(5000, "At most 5000 characters"),
});

export const analyticsEventSchema = z.object({
  type: z.enum(["PAGE_VIEW", "PROJECT_VIEW", "MILESTONE_VIEW"]),
  path: z.string().max(300).regex(/^\/[^\s]*$/, "Invalid path"),
  projectSlug: slug.optional(),
  referrer: z.string().max(500).optional(),
});

export type FieldErrors = Record<string, string>;

export function toFieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
