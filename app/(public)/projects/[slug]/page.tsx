import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getHomeContent, getProjectForPreview, getPublishedProject } from "@/lib/services/public";
import { getAdmin } from "@/lib/auth/guard";
import { slug as slugSchema } from "@/lib/validation/schemas";
import { PublicShell } from "@/components/portfolio/PublicShell";
import { PageView } from "@/components/portfolio/PageView";
import { ProjectGallery } from "@/components/portfolio/ProjectGallery";

type Props = PageProps<"/projects/[slug]">;

/** Drafts are only returned for `?preview=1` when the request comes from an active admin. */
async function load({ params, searchParams }: Props) {
  await connection();
  const { slug } = await params;
  if (!slugSchema.safeParse(slug).success) return { project: null, preview: false };
  const preview = (await searchParams).preview === "1" && Boolean(await getAdmin());
  return { project: preview ? await getProjectForPreview(slug) : await getPublishedProject(slug), preview };
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { project, preview } = await load(props);
  if (!project) return { title: "Project not found", robots: { index: false } };
  return {
    title: project.title,
    description: project.shortDescription,
    alternates: { canonical: `/projects/${project.slug}` },
    robots: preview ? { index: false, follow: false } : undefined,
    openGraph: { type: "article", title: project.title, description: project.shortDescription, images: project.cover ? [{ url: project.cover.url, alt: project.cover.alt }] : undefined },
  };
}

function Section({ title, text }: { title: string; text: string | null }) {
  if (!text) return null;
  return (
    <section>
      <h2>{title}</h2>
      <p>{text}</p>
    </section>
  );
}

export default async function ProjectPage(props: Props) {
  const [{ project, preview }, content] = await Promise.all([load(props), getHomeContent()]);
  if (!project) notFound();
  // Cover first, then gallery images; an image picked as both appears once.
  const slides = [project.cover, ...project.gallery].filter((img, i, all): img is NonNullable<typeof img> => !!img && all.findIndex((o) => o?.url === img.url) === i);

  return (
    <PublicShell content={content} base="/">
      <main id="main" className="pd wrap">
        {preview && project.status !== "PUBLISHED" && <p className="banner mono">Draft preview: only visible to admins</p>}
        <Link href="/projects" className="mono" style={{ color: "var(--mut)" }}>
          ← All projects
        </Link>
        <h1 className="h" style={{ margin: "20px 0 12px" }}>
          {project.title}
        </h1>
        <p className="lead" style={{ maxWidth: "60ch" }}>
          {project.shortDescription}
        </p>
        {slides.length > 0 ? (
          <ProjectGallery images={slides} title={project.title} />
        ) : (
          <div className="cover">
            <div className="pc" style={{ border: 0, background: "none", height: "100%" }}>
              <div className="im" style={{ height: "100%", aspectRatio: "auto" }}>
                <div className="ph" style={{ width: "14%" }} aria-hidden="true" />
              </div>
            </div>
          </div>
        )}
        <dl className="meta">
          <div>
            <dt className="mono">Type</dt>
            <dd>{project.projectType}</dd>
          </div>
          {project.role && (
            <div>
              <dt className="mono">Role</dt>
              <dd>{project.role}</dd>
            </div>
          )}
          {project.period && (
            <div>
              <dt className="mono">Period</dt>
              <dd>{project.period}</dd>
            </div>
          )}
          {project.technologies.length > 0 && (
            <div>
              <dt className="mono">Stack</dt>
              <dd className="chips" style={{ marginTop: 4 }}>
                {project.technologies.map((t) => (
                  <span key={t.slug}>{t.name}</span>
                ))}
              </dd>
            </div>
          )}
        </dl>
        {(project.liveUrl || project.repositoryUrl) && (
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 28 }}>
            {project.liveUrl && (
              <a className="btn w" href={project.liveUrl} target="_blank" rel="noopener noreferrer">
                Live demo <span aria-hidden="true">↗</span>
              </a>
            )}
            {project.repositoryUrl && (
              <a className="btn" href={project.repositoryUrl} target="_blank" rel="noopener noreferrer">
                Repository <span aria-hidden="true">↗</span>
              </a>
            )}
          </div>
        )}
        <div className="body">
          <Section title="Overview" text={project.description} />
          <Section title="Problem" text={project.problemStatement} />
          <Section title="Solution" text={project.solution} />
        </div>
      </main>
      {!preview && <PageView projectSlug={project.slug} />}
    </PublicShell>
  );
}
