import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Award, FileText } from "lucide-react";
import { CertificatePreview } from "./CertificatePreview";
import type { HomeContent } from "@/lib/services/public";
import { Multiline } from "./Multiline";
import { ProjectCard } from "./ProjectCard";
import { ProjectCarousel } from "./ProjectCarousel";

/** Featured projects shown on the home page; any beyond this go behind a "Show more projects" card. */
const HOME_PROJECTS = 5;

type Settings = NonNullable<HomeContent["settings"]>;

export function ProjectsSection({ settings, projects }: { settings: Settings; projects: HomeContent["projects"] }) {
  return (
    <section className="s" id="work" aria-labelledby="work-title">
      <div className="wrap pr">
        <div>
          <h2 className="h" id="work-title">
            <Multiline text={settings.projectsHeadline} />
          </h2>
          <p className="lead">{settings.projectsDescription}</p>
          <Link className="btn" href="/projects">
            View all projects <span aria-hidden="true">→</span>
          </Link>
        </div>
        {projects.length ? (
          <ProjectCarousel>
            {projects.slice(0, HOME_PROJECTS).map((p, i) => (
              <ProjectCard key={p.id} project={p} index={i} />
            ))}
            {projects.length > HOME_PROJECTS && (
              <Link className="pc pc-more" href="/projects">
                <span className="mono">+{projects.length - HOME_PROJECTS} more</span>
                <b>Show more projects</b>
                <ArrowUpRight size={22} aria-hidden="true" />
              </Link>
            )}
          </ProjectCarousel>
        ) : (
          <p className="lead">Featured projects will appear here soon.</p>
        )}
      </div>
    </section>
  );
}

type AboutProps = { settings: Settings; profile: HomeContent["profile"]; skillGroups: HomeContent["skillGroups"] };

function SkillIndex({ groups }: { groups: HomeContent["skillGroups"] }) {
  return (
    <dl className="skills" aria-label="Skills">
      {groups.map((g) => (
        <div key={g.category}>
          <dt className="mono">{g.category}</dt>
          <dd>
            {g.items.map((s) => (
              <span key={s.name} title={s.description ?? undefined}>
                {s.name}
              </span>
            ))}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function AboutSection({ settings, profile }: Omit<AboutProps, "skillGroups">) {
  const portrait = profile?.aboutImage;
  const heading = (
    <h2 className="h" id="about-title">
      <Multiline text={settings.aboutHeadline} />
    </h2>
  );
  const body = (
    <div>
      {profile && <p className="lead about-text">{profile.longBio ?? profile.shortBio}</p>}
      {profile?.email && (
        <a className="about-email" href={`mailto:${profile.email}`}>
          <span className="mono">E-mail</span>
          {profile.email}
        </a>
      )}
      <div className="bt" style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {profile?.resumeUrl && (
          // Same-origin file, so `download` saves it instead of opening the PDF viewer.
          <a className="btn w" href={profile.resumeUrl} download={`${profile.fullName.replace(/\s+/g, "-")}-CV.pdf`}>
            Download my CV <span aria-hidden="true">↓</span>
          </a>
        )}
        <a className="btn" href="#experience">
          Learn more <span aria-hidden="true">→</span>
        </a>
      </div>
    </div>
  );
  return (
    <section className="s tight" id="about" aria-labelledby="about-title">
      {portrait ? (
        <div className="wrap ab">
          <div>
            {heading}
            {body}
          </div>
          <div className="pic">
            <Image src={portrait.url} alt={portrait.alt || profile.fullName} fill sizes="(max-width: 820px) 100vw, 50vw" />
          </div>
        </div>
      ) : (
        <div className="wrap split">
          {heading}
          {body}
        </div>
      )}
    </section>
  );
}

export function SkillsSection({ settings, skillGroups }: { settings: Settings; skillGroups: HomeContent["skillGroups"] }) {
  if (skillGroups.length === 0) return null;
  return (
    <section className="s tight" id="skills" aria-labelledby="skills-title">
      <div className="wrap split">
        <h2 className="h" id="skills-title">
          <Multiline text={settings.skillsHeadline} />
        </h2>
        <SkillIndex groups={skillGroups} />
      </div>
    </section>
  );
}

type TimelineItem = HomeContent["timeline"][number] | HomeContent["education"][number];

function Timeline({ items }: { items: TimelineItem[] }) {
  return (
    <ol className="tl">
      {items.map((t) => (
        <li key={t.id}>
          <b>{t.title}</b>
          {t.subtitle && <span>{t.subtitle}</span>}
          {(t.period || t.location) && <em>{[t.period, t.location].filter(Boolean).join(" · ")}</em>}
          {t.description && <p>{t.description}</p>}
          {t.achievements.length > 0 && (
            <ul>
              {t.achievements.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ol>
  );
}

export function ExperienceSection({ settings, timeline }: { settings: Settings; timeline: HomeContent["timeline"] }) {
  return (
    <section className="s tight" id="experience" aria-labelledby="experience-title">
      <div className="wrap split">
        <h2 className="h" id="experience-title">
          <Multiline text={settings.experienceHeadline} />
        </h2>
        {timeline.length ? <Timeline items={timeline} /> : <p className="lead">Experience will appear here soon.</p>}
      </div>
    </section>
  );
}

export function EducationSection({ settings, education }: { settings: Settings; education: HomeContent["education"] }) {
  if (education.length === 0) return null;
  return (
    <section className="s tight" id="education" aria-labelledby="education-title">
      <div className="wrap split">
        <h2 className="h" id="education-title">
          <Multiline text={settings.educationHeadline} />
        </h2>
        <Timeline items={education} />
      </div>
    </section>
  );
}

export function CertificationsSection({ settings, certifications }: { settings: Settings; certifications: HomeContent["certifications"] }) {
  if (certifications.length === 0) return null;
  return (
    <section className="s tight" id="certifications" aria-labelledby="certifications-title">
      <div className="wrap split">
        <h2 className="h" id="certifications-title">
          <Multiline text={settings.certificationsHeadline} />
        </h2>
        <ul className="certs">
          {certifications.map((c) => (
            <li key={c.id} className={`cert ${c.expired ? "expired" : ""}`}>
              <span className="badge" aria-hidden="true">
                {c.file && !c.file.isPdf ? <Image src={c.file.url} alt="" width={44} height={44} /> : c.file ? <FileText size={18} strokeWidth={1.5} /> : <Award size={18} strokeWidth={1.5} />}
              </span>
              <b>{c.name}</b>
              <span className="when mono">{c.expired ? `Expired ${c.expires}` : (c.issued ?? "")}</span>
              <span className="meta">
                {c.issuer}
                {c.credentialId && <em> · ID {c.credentialId}</em>}
              </span>
              <span className="actions">
                {c.file && <CertificatePreview file={c.file} name={c.name} />}
                {c.credentialUrl && (
                  <a className="verify mono" href={c.credentialUrl} target="_blank" rel="noopener noreferrer" aria-label={`Verify ${c.name} (opens the issuer's site)`}>
                    Verify <ArrowUpRight size={13} aria-hidden="true" />
                  </a>
                )}
              </span>
              {c.description && <p>{c.description}</p>}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function SiteFooter({ settings }: { settings: Settings }) {
  return (
    <footer className="end">
      <b>{settings.footerHeadline}</b>
      <span>{settings.footerNote}</span>
    </footer>
  );
}
