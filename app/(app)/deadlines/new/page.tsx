import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { createServerClient } from "@/lib/supabase/server";
import { TaskForm } from "../task-form";

export default async function NewDeadlinePage() {
  const supabase = await createServerClient();
  const [{ data: companies }, { data: people }, { data: processes }] = await Promise.all([
    supabase.from("company").select("id, name").order("name"),
    supabase.from("person").select("id, first_name, last_name, company_id").order("last_name"),
    supabase.from("process").select("id, code, name").order("code"),
  ]);
  return (
    <>
      <PageHeader title="Nuovo task" description="Crea una nuova scadenza operativa" />
      <Card>
        <CardContent className="p-6">
          <TaskForm
            companies={companies ?? []}
            people={people ?? []}
            processes={processes ?? []}
          />
        </CardContent>
      </Card>
    </>
  );
}
