import type { Metadata } from "next";
import { connection } from "next/server";
import { getHomeContent, getPublishedProjects } from "@/lib/services/public";
import { PublicShell } from "@/components/portfolio/PublicShell";
import { ProjectCard } from "@/components/portfolio/ProjectCard";
import { PageView } from "@/components/portfolio/PageView";

export const metadata: Metadata = {
  title: "Projects",
  description: "Software engineering projects by Michael Wijaya.",
  alternates: { canonical: "/projects" },
};

export default async function ProjectsPage() {
  await connection();
  const [content, projects] = await Promise.all([getHomeContent(), getPublishedProjects()]);
  return (
    <PublicShell content={content} base="/">
      <main id="main" className="pd wrap">
        <span className="mono" style={{ color: "var(--mut)" }}>
          Work
        </span>
        <h1 className="h" style={{ margin: "16px 0 48px" }}>
          All Projects.
        </h1>
        {projects.length ? (
          <div className="cards" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
            {projects.map((p, i) => (
              <ProjectCard key={p.id} project={p} index={i} />
            ))}
          </div>
        ) : (
          <p className="lead">No projects have been published yet.</p>
        )}
      </main>
      <PageView />
    </PublicShell>
  );
}
