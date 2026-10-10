import Link from "next/link";
import { notFound } from "next/navigation";
import { assetOptions, ENTITIES, routeStops, toValues } from "@/lib/admin/registry";
import { idSchema } from "@/lib/validation/schemas";
import { EntityForm } from "@/components/admin/EntityForm";
import { PageHeader } from "@/components/admin/ui";

export default async function EditEntityPage({ params }: PageProps<"/admin/[entity]/[id]">) {
  const { entity, id } = await params;
  const config = Object.hasOwn(ENTITIES, entity) ? ENTITIES[entity] : null;
  if (!config || !idSchema.safeParse(id).success) notFound();
  const [record, fields, assets, stops] = await Promise.all([
    config.load(id),
    config.fields(),
    config.needsAssets ? assetOptions() : [],
    config.isMilestone ? routeStops() : [],
  ]);
  if (!record) notFound();
  const values = toValues(record);

  return (
    <>
      <Link href={`/admin/${entity}`} className="adm-link">
        ← {config.title}
      </Link>
      <PageHeader title={`Edit ${config.singular}`} description={typeof values.title === "string" ? values.title : undefined} />
      <EntityForm fields={fields} values={values} action={config.action} id={id} assets={assets} routeStops={stops} milestonePreview={config.isMilestone} />
    </>
  );
}
