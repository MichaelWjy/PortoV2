import "server-only";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import { formatYearRange } from "@/lib/format";
import { mediaUrl } from "@/lib/services/media";
import { PUBLIC_CONTENT_TAG } from "@/lib/services/cache";
import { isLandmark } from "@/lib/roadmap/landmarks";

// Public reads return only PUBLISHED / visible records and plain JSON (dates as ISO strings),
// because cached values are serialized.

const iso = (d: Date | null) => (d ? d.toISOString() : null);

type AssetRow = { objectKey: string; altText: string; width: number | null; height: number | null } | null;
export type PublicImage = { url: string; alt: string; width: number | null; height: number | null };
const image = (a: AssetRow): PublicImage | null => (a ? { url: mediaUrl(a.objectKey), alt: a.altText, width: a.width, height: a.height } : null);

const assetSelect = { select: { objectKey: true, altText: true, width: true, height: true } } as const;

const projectInclude = {
  cover: assetSelect,
  technologies: { select: { technology: { select: { name: true, slug: true } } }, orderBy: { technology: { name: "asc" } } },
} as const;

type ProjectRow = Awaited<ReturnType<typeof findProjects>>[number];
function findProjects(where: { featured?: boolean; slug?: string; status?: "PUBLISHED" }) {
  return prisma.project.findMany({ where, include: projectInclude, orderBy: [{ sortOrder: "asc" }, { publishedAt: "desc" }] });
}

function toProject(p: ProjectRow) {
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    projectType: p.projectType,
    shortDescription: p.shortDescription,
    description: p.description,
    problemStatement: p.problemStatement,
    solution: p.solution,
    role: p.role,
    period: formatYearRange(iso(p.startDate), iso(p.endDate)),
    repositoryUrl: p.repositoryUrl,
    liveUrl: p.liveUrl,
    featured: p.featured,
    status: p.status,
    cover: image(p.cover),
    technologies: p.technologies.map((t) => t.technology),
    publishedAt: iso(p.publishedAt),
    updatedAt: p.updatedAt.toISOString(),
  };
}
export type PublicProject = ReturnType<typeof toProject>;

async function loadHome() {
  const [settings, profile, projects, skills, experiences, education, milestones, socialLinks, certifications] = await Promise.all([
    prisma.siteSettings.findUnique({ where: { id: "site" } }),
    prisma.profile.findUnique({ where: { id: "profile" }, include: { profileImage: assetSelect, aboutImage: assetSelect, resume: assetSelect } }),
    findProjects({ status: "PUBLISHED", featured: true }),
    prisma.skill.findMany({ where: { status: "PUBLISHED" }, orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { name: "asc" }] }),
    prisma.experience.findMany({ where: { status: "PUBLISHED" }, orderBy: [{ sortOrder: "asc" }, { startDate: "desc" }] }),
    prisma.education.findMany({ where: { status: "PUBLISHED" }, orderBy: [{ sortOrder: "asc" }, { startDate: "desc" }] }),
    prisma.milestone.findMany({
      where: { status: "PUBLISHED" },
      orderBy: [{ routePosition: "asc" }, { sortOrder: "asc" }],
      include: {
        image: assetSelect,
        relatedProject: { select: { slug: true, title: true, status: true } },
        relatedExperience: { select: { organization: true, position: true, status: true } },
      },
    }),
    prisma.socialLink.findMany({ where: { isVisible: true }, orderBy: [{ sortOrder: "asc" }, { platform: "asc" }] }),
    prisma.certification.findMany({ where: { status: "PUBLISHED" }, orderBy: [{ sortOrder: "asc" }, { issueDate: "desc" }], include: { image: assetSelect } }),
  ]);

  const skillGroups = new Map<string, { name: string; description: string | null }[]>();
  for (const s of skills) skillGroups.set(s.category, [...(skillGroups.get(s.category) ?? []), { name: s.name, description: s.description }]);

  return {
    settings: settings ? { ...settings, createdAt: undefined, updatedAt: undefined } : null,
    profile: profile
      ? {
          fullName: profile.fullName,
          professionalTitle: profile.professionalTitle,
          location: profile.location,
          shortBio: profile.shortBio,
          longBio: profile.longBio,
          email: profile.email,
          availabilityStatus: profile.availabilityStatus,
          image: image(profile.profileImage),
          aboutImage: image(profile.aboutImage) ?? image(profile.profileImage),
          resumeUrl: profile.resume ? mediaUrl(profile.resume.objectKey) : null,
        }
      : null,
    projects: projects.map(toProject),
    skillGroups: [...skillGroups].map(([category, items]) => ({ category, items })),
    timeline: [
      ...experiences.map((e) => ({
        id: e.id,
        kind: "experience" as const,
        title: e.organization,
        subtitle: [e.position, e.employmentType].filter(Boolean).join(" · "),
        period: formatYearRange(iso(e.startDate), iso(e.endDate), e.isCurrent),
        location: e.location,
        description: e.description,
        achievements: e.achievements,
        isCurrent: e.isCurrent,
      })),
      ...education.map((e) => ({
        id: e.id,
        kind: "education" as const,
        title: e.institution,
        subtitle: [e.degree, e.fieldOfStudy].filter(Boolean).join(", "),
        period: formatYearRange(iso(e.startDate), iso(e.endDate), e.isCurrent),
        location: e.location,
        description: e.description,
        achievements: [] as string[],
        isCurrent: e.isCurrent,
      })),
    ],
    milestones: milestones.map((m) => ({
      id: m.id,
      slug: m.slug,
      title: m.title,
      category: m.category,
      shortDescription: m.shortDescription,
      description: m.description,
      tags: m.tags,
      period: formatYearRange(iso(m.startDate), iso(m.endDate)),
      locationLabel: m.locationLabel,
      landmark: isLandmark(m.landmark) ? m.landmark : ("flag" as const),
      routePosition: m.routePosition,
      image: image(m.image),
      // Related records are only linked when they are public themselves.
      project: m.relatedProject?.status === "PUBLISHED" ? { slug: m.relatedProject.slug, title: m.relatedProject.title } : null,
      experience: m.relatedExperience?.status === "PUBLISHED" ? { organization: m.relatedExperience.organization, position: m.relatedExperience.position } : null,
    })),
    certifications: certifications.map((c) => ({
      id: c.id,
      name: c.name,
      issuer: c.issuer,
      issued: formatYearRange(iso(c.issueDate), null),
      expires: c.expiryDate ? formatYearRange(iso(c.expiryDate), null) : null,
      expired: Boolean(c.expiryDate && c.expiryDate < new Date()),
      credentialId: c.credentialId,
      credentialUrl: c.credentialUrl,
      description: c.description,
      image: image(c.image),
    })),
    socialLinks: socialLinks.map((s) => ({ id: s.id, platform: s.platform, label: s.label, url: s.url, icon: s.icon })),
  };
}

export type HomeContent = Awaited<ReturnType<typeof loadHome>>;
export type PublicMilestone = HomeContent["milestones"][number];

export const getHomeContent = unstable_cache(loadHome, ["home-content"], { tags: [PUBLIC_CONTENT_TAG], revalidate: 3600 });

export const getPublishedProjects = unstable_cache(
  async () => (await findProjects({ status: "PUBLISHED" })).map(toProject),
  ["published-projects"],
  { tags: [PUBLIC_CONTENT_TAG], revalidate: 3600 },
);

export const getPublishedProject = unstable_cache(
  async (slug: string) => {
    const [p] = await findProjects({ status: "PUBLISHED", slug });
    return p ? toProject(p) : null;
  },
  ["published-project"],
  { tags: [PUBLIC_CONTENT_TAG], revalidate: 3600 },
);

/** Uncached, includes drafts. Callers must have verified admin access first. */
export async function getProjectForPreview(slug: string) {
  const [p] = await findProjects({ slug });
  return p ? toProject(p) : null;
}
