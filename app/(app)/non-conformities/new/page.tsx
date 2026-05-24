import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { createServerClient } from "@/lib/supabase/server";
import { NcForm } from "../nc-form";

export default async function NewNcPage() {
  const supabase = await createServerClient();
  const [{ data: companies }, { data: processes }, { data: people }] = await Promise.all([
    supabase.from("company").select("id, name").order("name"),
    supabase.from("process").select("id, code, name").order("code"),
    supabase.from("person").select("id, first_name, last_name").order("last_name"),
  ]);
  return (
    <>
      <PageHeader title="Nuova non conformità" />
      <Card>
        <CardContent className="p-6">
          <NcForm
            companies={companies ?? []}
            processes={processes ?? []}
            people={people ?? []}
          />
        </CardContent>
      </Card>
    </>
  );
}
