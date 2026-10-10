/**
 * Safe to rerun: every write is create-if-missing, so edits made in the admin are never overwritten.
 *
 * - Always: SiteSettings (interface copy from the design prototype) and the owner's basic Profile.
 * - Only when NODE_ENV !== "production": sample portfolio content. Facts come from the owner's brief
 *   (AGENTS.md section 15) and are marked TODO(verify); anything not provided by the owner is an explicit
 *   "[Sample]" placeholder. Production content is entered through the admin dashboard.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { caFromEnv, pgOptions } from "../lib/db-ssl";

const prisma = new PrismaClient({ adapter: new PrismaPg(pgOptions(process.env.DATABASE_URL!, caFromEnv(process.env))) });
const isProduction = process.env.NODE_ENV === "production";
const SAMPLE = "[Sample] Replace this text in the admin dashboard.";

async function base() {
  await prisma.siteSettings.upsert({
    where: { id: "site" },
    update: {},
    create: {
      id: "site",
      heroEyebrow: "Software Engineer / Indonesia",
      heroHeadline: "Michael\nWijaya.",
      heroDescription: "I design and build digital experiences where technology, engineering and thoughtful design come together.",
      heroPrimaryCtaLabel: "View projects",
      heroSecondaryCtaLabel: "About me",
      journeyEyebrow: "My journey",
      journeyHeadline: "Small Steps,\nBig Dreams.",
      journeyDescription: "Every milestone tells a story, from where I started to where I'm going. Move the car and explore my journey.",
      projectsHeadline: "Selected\nProjects.",
      projectsDescription: "A collection of projects that showcase my skills, problem solving and passion for building meaningful solutions.",
      aboutHeadline: "About\nMe.",
      experienceHeadline: "Work\nExperience.",
      contactHeadline: "Let's\nConnect.",
      contactDescription: "Have a project in mind or just want to say hi? Feel free to reach out.",
      footerHeadline: "Thanks for visiting!",
      footerNote: "© 2026 Michael Wijaya",
      seoTitle: "Michael Wijaya | Software Engineer",
      seoDescription: "Portfolio of Michael Wijaya, a software engineer from Indonesia: projects, experience and career journey.",
    },
  });

  await prisma.profile.upsert({
    where: { id: "profile" },
    update: {},
    create: {
      id: "profile",
      fullName: "Michael Wijaya",
      professionalTitle: "Software Engineer",
      location: "Indonesia",
      shortBio: "I'm a Computer Science student with a passion for software engineering, web development and creating solutions that have a real impact.",
    },
  });
}

async function sample() {
  const tech = async (name: string, slug: string, category: string) =>
    prisma.technology.upsert({ where: { slug }, update: {}, create: { name, slug, category } });
  const [nextjs, ts, postgres, reactNative] = await Promise.all([
    tech("Next.js", "nextjs", "Framework"),
    tech("TypeScript", "typescript", "Language"),
    tech("PostgreSQL", "postgresql", "Database"),
    tech("React Native", "react-native", "Framework"),
  ]);

  const project = (slug: string, title: string, projectType: string, featured: boolean, published: boolean, sortOrder: number, techIds: string[]) =>
    prisma.project.upsert({
      where: { slug },
      update: {},
      create: {
        slug,
        title,
        projectType,
        shortDescription: SAMPLE,
        description: SAMPLE,
        featured,
        sortOrder,
        status: published ? "PUBLISHED" : "DRAFT",
        publishedAt: published ? new Date("2026-01-01T00:00:00Z") : null,
        technologies: { create: techIds.map((technologyId) => ({ technologyId })) },
      },
    });
  // TODO(verify): titles and types from the owner's brief; descriptions, links and technologies need real content.
  const bizbridge = await project("bizbridge", "BizBridge", "Full Stack Web Application", true, true, 1, [nextjs.id, ts.id, postgres.id]);
  await project("setrum", "SETRUM", "React Native Mobile App", true, true, 2, [reactNative.id, ts.id]);
  await project("sea-catering", "SEA Catering", "[Sample] Project type", false, false, 3, []);
  await project("ggnn-research", "GGNN Research", "[Sample] Research project", false, false, 4, []);

  const experienceCount = await prisma.experience.count();
  let bca = await prisma.experience.findFirst({ where: { organization: "PT Bank Central Asia Tbk" } });
  if (experienceCount === 0) {
    // TODO(verify): from the owner's brief.
    bca = await prisma.experience.create({
      data: { organization: "PT Bank Central Asia Tbk", position: "Application Developer Intern", employmentType: "Internship", description: "Consumer Credit Division.", startDate: new Date("2026-01-01T00:00:00Z"), isCurrent: true, status: "PUBLISHED", sortOrder: 1 },
    });
    await prisma.experience.create({ data: { organization: "COMPFEST 17", position: "Product Developer", status: "PUBLISHED", sortOrder: 2 } });
  }
  if ((await prisma.education.count()) === 0) {
    await prisma.education.create({
      data: { institution: "BINUS University", degree: "Computer Science", fieldOfStudy: "Software Engineering", location: "Semarang", isCurrent: true, status: "PUBLISHED", sortOrder: 1 },
    });
  }
  if ((await prisma.skill.count()) === 0) {
    await prisma.skill.createMany({
      data: [
        { name: "TypeScript", category: "Languages", status: "PUBLISHED", sortOrder: 1 },
        { name: "Next.js", category: "Web", status: "PUBLISHED", sortOrder: 1 },
        { name: "React Native", category: "Mobile", status: "PUBLISHED", sortOrder: 1 },
        { name: "PostgreSQL", category: "Data", status: "PUBLISHED", sortOrder: 1 },
      ],
    });
  }
  if ((await prisma.socialLink.count()) === 0) {
    // TODO(verify): contact details from the owner's brief.
    await prisma.socialLink.createMany({
      data: [
        { platform: "Email", label: "michaelwijaya@gmail.com", url: "mailto:michaelwijaya@gmail.com", icon: "@", sortOrder: 1 },
        { platform: "LinkedIn", label: "linkedin.com/in/michael-wijaya25", url: "https://www.linkedin.com/in/michael-wijaya25", icon: "in", sortOrder: 2 },
        { platform: "GitHub", label: "github.com/Michaelwify", url: "https://github.com/Michaelwify", icon: "gh", sortOrder: 3 },
      ],
    });
  }

  if ((await prisma.certification.count()) === 0) {
    // Development placeholders only: real certifications are entered by the owner in the admin.
    await prisma.certification.createMany({
      data: [
        { name: "[Sample] Certification name", issuer: "[Sample] Issuer", issueDate: new Date("2025-01-01T00:00:00Z"), credentialUrl: "https://example.com/verify", status: "PUBLISHED", sortOrder: 1 },
        { name: "[Sample] Second certification", issuer: "[Sample] Issuer", status: "PUBLISHED", sortOrder: 2 },
      ],
    });
  }

  const milestones = [
    { slug: "high-school", landmark: "school", title: "High School", category: "Where it began", shortDescription: "The starting point of the journey.", tags: ["Beginning"] },
    { slug: "binus", landmark: "campus", title: "BINUS University", category: "Education", shortDescription: "Studying Computer Science with a Software Engineering focus at BINUS University, Semarang.", tags: ["Computer Science"], locationLabel: "Semarang" },
    { slug: "software-engineering", landmark: "code", title: "Software Engineering", category: "Focus", shortDescription: SAMPLE, tags: ["Software Engineering"] },
    { slug: "projects", landmark: "rocket", title: "Projects", category: "Building", shortDescription: "Full stack web and React Native mobile projects.", tags: ["Web", "Mobile"], relatedProjectId: bizbridge.id },
    { slug: "internship", landmark: "office", title: "Internship", category: "BCA, 2026", shortDescription: "Application Developer intern at PT Bank Central Asia Tbk, Consumer Credit Division.", tags: ["BCA", "Application Developer"], relatedExperienceId: bca?.id ?? null },
    { slug: "competition", landmark: "trophy", title: "Competition", category: "COMPFEST 17", shortDescription: "Product Developer at COMPFEST 17.", tags: ["Product"] },
    { slug: "future-goal", landmark: "flag", title: "What is next", category: "Career", shortDescription: "The road continues from here.", tags: ["Next"] },
  ];
  for (const [i, m] of milestones.entries()) {
    await prisma.milestone.upsert({
      where: { slug: m.slug },
      update: {},
      create: { ...m, routePosition: Number((0.08 + (i * 0.86) / (milestones.length - 1)).toFixed(3)), sortOrder: i, status: "PUBLISHED" },
    });
  }
}

async function main() {
  await base();
  if (isProduction) {
    console.log("Seeded base settings and profile (production: sample content skipped).");
  } else {
    await sample();
    console.log("Seeded base settings, profile and labelled sample content.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
