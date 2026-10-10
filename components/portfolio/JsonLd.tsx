import type { HomeContent } from "@/lib/services/public";

/** schema.org Person built only from stored profile fields; no invented credentials. */
export function JsonLd({ profile, socialLinks }: { profile: NonNullable<HomeContent["profile"]>; socialLinks: HomeContent["socialLinks"] }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: profile.fullName,
    jobTitle: profile.professionalTitle,
    address: { "@type": "PostalAddress", addressCountry: profile.location },
    url: process.env.APP_URL,
    sameAs: socialLinks.filter((s) => s.url.startsWith("https://")).map((s) => s.url),
  };
  // Escape "<" so stored text can never close the script element.
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
