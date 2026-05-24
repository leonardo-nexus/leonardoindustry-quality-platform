import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createServerClient } from "@/lib/supabase/server";
import { NewInterventionForm } from "./form";

export default async function NewInterventionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerClient();
  const { data: asset } = await supabase.from("asset").select("id, code, name, status").eq("id", id).maybeSingle();
  if (!asset) notFound();
  const { data: people } = await supabase.from("person").select("id, first_name, last_name").eq("active", true).order("last_name");

  return (
    <>
      <PageHeader
        title={`Nuovo intervento · ${asset.code}`}
        description={asset.name}
        actions={<Button asChild variant="outline"><Link href={`/assets/${id}/interventions`}>← Interventi</Link></Button>}
      />
      <Card className="leo-card max-w-4xl">
        <CardContent className="p-6">
          <NewInterventionForm assetId={id} currentStatus={asset.status} people={people ?? []} />
        </CardContent>
      </Card>
    </>
  );
}
