import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { createServerClient } from "@/lib/supabase/server";
import { AssetForm } from "../asset-form";

export default async function NewAssetPage() {
  const supabase = await createServerClient();
  const { data: companies } = await supabase.from("company").select("id, name").order("name");
  return (
    <>
      <PageHeader title="Nuovo asset" />
      <Card>
        <CardContent className="p-6">
          <AssetForm companies={companies ?? []} />
        </CardContent>
      </Card>
    </>
  );
}
