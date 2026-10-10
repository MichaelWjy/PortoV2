import { prisma } from "@/lib/db";
import { toValues } from "@/lib/admin/registry";
import { EntityForm } from "@/components/admin/EntityForm";
import { PageHeader } from "@/components/admin/ui";
import type { Field } from "@/components/admin/fields";
import { saveSiteSettings } from "../actions";

const text = (name: string, label: string, help?: string): Field => ({ name, label, type: "text", required: true, help });
const area = (name: string, label: string): Field => ({ name, label, type: "textarea", required: true, rows: 2 });
const headline = (name: string, label: string): Field => ({ name, label, type: "textarea", required: true, rows: 2 });

const fields: Field[] = [
  text("navWorkLabel", "Nav: Work"),
  text("navAboutLabel", "Nav: About"),
  text("navExperienceLabel", "Nav: Experience"),
  text("navContactLabel", "Nav: Contact"),
  text("availabilityLabel", "Availability label"),
  text("heroEyebrow", "Hero eyebrow"),
  headline("heroHeadline", "Hero headline (line breaks are kept)"),
  area("heroDescription", "Hero description"),
  text("heroPrimaryCtaLabel", "Hero primary button"),
  text("heroSecondaryCtaLabel", "Hero secondary button"),
  text("journeyEyebrow", "Journey eyebrow"),
  headline("journeyHeadline", "Journey headline"),
  area("journeyDescription", "Journey description"),
  headline("projectsHeadline", "Projects headline"),
  area("projectsDescription", "Projects description"),
  headline("aboutHeadline", "About headline"),
  headline("skillsHeadline", "Skills headline"),
  headline("experienceHeadline", "Experience headline"),
  headline("certificationsHeadline", "Certifications headline"),
  headline("contactHeadline", "Contact headline"),
  area("contactDescription", "Contact description"),
  text("footerHeadline", "Footer headline"),
  text("footerNote", "Footer note"),
  text("seoTitle", "SEO title", "Up to 70 characters."),
  area("seoDescription", "SEO description"),
];

export default async function SettingsPage() {
  const settings = await prisma.siteSettings.findUnique({ where: { id: "site" } });
  return (
    <>
      <PageHeader title="Site copy & SEO" description="Every label and headline on the public site. Changes appear immediately." />
      <EntityForm fields={fields} values={settings ? toValues(settings) : {}} action={saveSiteSettings} />
    </>
  );
}
