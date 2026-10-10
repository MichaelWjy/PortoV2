import Image from "next/image";
import Link from "next/link";
import type { PublicProject } from "@/lib/services/public";

export function ProjectCard({ project, index }: { project: PublicProject; index: number }) {
  return (
    <Link className="pc" href={`/projects/${project.slug}`}>
      <div className="im">
        {project.cover ? (
          <Image src={project.cover.url} alt={project.cover.alt} fill sizes="(max-width: 820px) 50vw, 30vw" />
        ) : (
          <div className="ph" aria-hidden="true" />
        )}
      </div>
      <div className="tt">
        <span className="mono">{String(index + 1).padStart(2, "0")}</span>
        <b>{project.title}</b>
        <small>{project.projectType}</small>
        <p>{project.shortDescription}</p>
      </div>
    </Link>
  );
}
