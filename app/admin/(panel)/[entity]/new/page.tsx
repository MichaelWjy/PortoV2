import Link from "next/link";
import { notFound } from "next/navigation";
import { assetOptions, ENTITIES, routeStops } from "@/lib/admin/registry";
import { EntityForm } from "@/components/admin/EntityForm";
import { PageHeader } from "@/components/admin/ui";

export default async function NewEntityPage({ params }: PageProps<"/admin/[entity]/new">) {
  const { entity } = await params;
  const config = Object.hasOwn(ENTITIES, entity) ? ENTITIES[entity] : null;
  if (!config) notFound();
  const [fields, assets, stops] = await Promise.all([config.fields(), config.needsAssets ? assetOptions() : [], config.isMilestone ? routeStops() : []]);

  return (
    <>
      <Link href={`/admin/${entity}`} className="adm-link">
        ← {config.title}
      </Link>
      <PageHeader title={`New ${config.singular}`} />
      <EntityForm fields={fields} values={config.defaults} action={config.action} assets={assets} routeStops={stops} milestonePreview={config.isMilestone} submitLabel="Create" />
    </>
  );
}
