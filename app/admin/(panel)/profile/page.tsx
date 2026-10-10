import { prisma } from "@/lib/db";
import { assetOptions, toValues } from "@/lib/admin/registry";
import { EntityForm } from "@/components/admin/EntityForm";
import { PageHeader } from "@/components/admin/ui";
import type { Field } from "@/components/admin/fields";
import { saveProfile } from "../actions";

const fields: Field[] = [
  { name: "fullName", label: "Full name", type: "text", required: true },
  { name: "professionalTitle", label: "Professional title", type: "text", required: true },
  { name: "location", label: "Location", type: "text", required: true },
  { name: "email", label: "Public e-mail", type: "email", help: "Shown in the About section as a mail link. Leave empty to hide it." },
  {
    name: "availabilityStatus",
    label: "Availability",
    type: "select",
    allowEmpty: false,
    options: [
      { value: "AVAILABLE", label: "Available (green dot)" },
      { value: "LIMITED", label: "Limited (amber dot)" },
      { value: "UNAVAILABLE", label: "Unavailable (hidden)" },
    ],
  },
  { name: "shortBio", label: "Short bio", type: "textarea", required: true, rows: 3 },
  { name: "longBio", label: "About text (overrides the short bio in About)", type: "textarea", rows: 6 },
  { name: "profileImageAssetId", label: "Portrait", type: "asset", accept: "image", help: "Shown in the hero and About section (rendered in black and white)." },
  { name: "aboutImageAssetId", label: "About photo (optional)", type: "asset", accept: "image", help: "Shown in About. Leave empty to reuse the portrait." },
  { name: "resumeAssetId", label: "CV (PDF)", type: "asset", accept: "pdf", help: "Upload the PDF in Media first. Visitors get a “Download my CV” button in About." },
];

export default async function ProfilePage() {
  const [profile, assets] = await Promise.all([prisma.profile.findUnique({ where: { id: "profile" } }), assetOptions()]);
  return (
    <>
      <PageHeader title="Profile" description="The owner's public profile." />
      <EntityForm fields={fields} values={profile ? toValues(profile) : { availabilityStatus: "AVAILABLE" }} action={saveProfile} assets={assets} />
    </>
  );
}
