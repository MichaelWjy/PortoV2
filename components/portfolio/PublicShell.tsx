import type { HomeContent } from "@/lib/services/public";
import { SiteNav } from "./SiteNav";
import { SiteFooter } from "./Sections";

type Props = { content: HomeContent; base: "" | "/"; children: React.ReactNode };

export function PublicShell({ content, base, children }: Props) {
  const { settings, profile } = content;
  if (!settings) return <NotConfigured />;
  return (
    <>
      <a className="skip-link mono" href="#main">
        Skip to content
      </a>
      <SiteNav
        base={base}
        labels={{ work: settings.navWorkLabel, about: settings.navAboutLabel, experience: settings.navExperienceLabel, contact: settings.navContactLabel }}
        availability={profile ? { label: settings.availabilityLabel, status: profile.availabilityStatus } : null}
      />
      {children}
      <SiteFooter settings={settings} />
    </>
  );
}

/** Shown instead of invented copy when the database has not been initialised. */
export function NotConfigured() {
  return (
    <main className="wrap" style={{ minHeight: "100svh", display: "grid", placeContent: "center", gap: 12 }}>
      <h1 className="h" style={{ fontSize: 32 }}>
        This site is not set up yet.
      </h1>
      <p className="lead">Site settings are missing from the database. Run the seed or complete setup in the admin dashboard.</p>
    </main>
  );
}
