import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { createServerClient } from "@/lib/supabase/server";
import { AuditForm } from "../audit-form";

export default async function NewAuditPage() {
  const supabase = await createServerClient();
  const [{ data: companies }, { data: standards }, { data: processes }, { data: people }] = await Promise.all([
    supabase.from("company").select("id, name").order("name"),
    supabase.from("standard").select("id, code").order("code"),
    supabase.from("process").select("id, code, name").order("code"),
    supabase.from("person").select("id, first_name, last_name").order("last_name"),
  ]);
  return (
    <>
      <PageHeader title="Nuovo audit" />
      <Card>
        <CardContent className="p-6">
          <AuditForm
            companies={companies ?? []}
            standards={standards ?? []}
            processes={processes ?? []}
            people={people ?? []}
          />
        </CardContent>
      </Card>
    </>
  );
}
