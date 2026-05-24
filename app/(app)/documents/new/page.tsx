import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { createServerClient } from "@/lib/supabase/server";
import { DocumentForm } from "../document-form";

export default async function NewDocumentPage() {
  const supabase = await createServerClient();
  const [{ data: companies }, { data: processes }] = await Promise.all([
    supabase.from("company").select("id, name").order("name"),
    supabase.from("process").select("id, code, name").order("code"),
  ]);
  return (
    <>
      <PageHeader title="Nuovo documento" />
      <Card>
        <CardContent className="p-6">
          <DocumentForm companies={companies ?? []} processes={processes ?? []} />
        </CardContent>
      </Card>
    </>
  );
}
