import type { Metadata } from "next";
import { connection } from "next/server";
import { getHomeContent } from "@/lib/services/public";
import { Preloader } from "@/components/portfolio/Preloader";
import { PublicShell } from "@/components/portfolio/PublicShell";
import { Hero } from "@/components/portfolio/Hero";
import { AboutSection, CertificationsSection, EducationSection, SkillsSection, ExperienceSection, ProjectsSection } from "@/components/portfolio/Sections";
import { ContactSection } from "@/components/portfolio/ContactSection";
import { JourneySection } from "@/components/roadmap/JourneySection";
import { PageView } from "@/components/portfolio/PageView";
import { JsonLd } from "@/components/portfolio/JsonLd";

export async function generateMetadata(): Promise<Metadata> {
  await connection();
  const { settings } = await getHomeContent();
  if (!settings) return {};
  return {
    title: { absolute: settings.seoTitle },
    description: settings.seoDescription,
    alternates: { canonical: "/" },
    openGraph: { type: "profile", title: settings.seoTitle, description: settings.seoDescription, url: "/" },
    twitter: { card: "summary_large_image", title: settings.seoTitle, description: settings.seoDescription },
  };
}

export default async function HomePage() {
  // Rendered per request from cached data, so the build never needs a database.
  await connection();
  const content = await getHomeContent();
  const { settings, profile } = content;

  return (
    <PublicShell content={content} base="">
      {settings && (
        <>
          <Preloader name={profile?.fullName ?? ""} />
          {/* Counter shows how many sections this page actually renders. */}
          <Hero settings={settings} profile={profile} sectionCount={5 + (content.milestones.length ? 1 : 0) + (content.certifications.length ? 1 : 0) + (content.skillGroups.length ? 1 : 0)} />
          <main id="main">
            <JourneySection settings={settings} milestones={content.milestones} />
            <ProjectsSection settings={settings} projects={content.projects} />
            <AboutSection settings={settings} profile={profile} />
            <SkillsSection settings={settings} skillGroups={content.skillGroups} />
            <ExperienceSection settings={settings} timeline={content.timeline} />
            <EducationSection settings={settings} education={content.education} />
            <CertificationsSection settings={settings} certifications={content.certifications} />
            <ContactSection settings={settings} socialLinks={content.socialLinks} />
          </main>
          <PageView />
          {profile && <JsonLd profile={profile} socialLinks={content.socialLinks} />}
        </>
      )}
    </PublicShell>
  );
}
