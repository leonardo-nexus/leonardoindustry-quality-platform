import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { createServerClient } from "@/lib/supabase/server";
import { ProjectForm } from "../project-form";

export default async function NewProjectPage() {
  const supabase = await createServerClient();
  const [{ data: companies }, { data: execClasses }, { data: people }] = await Promise.all([
    supabase.from("company").select("id, name").order("name"),
    supabase.from("execution_class").select("id, code").order("code"),
    supabase.from("person").select("id, first_name, last_name").order("last_name"),
  ]);
  return (
    <>
      <PageHeader title="Nuova commessa" />
      <Card>
        <CardContent className="p-6">
          <ProjectForm
            companies={companies ?? []}
            execClasses={execClasses ?? []}
            people={people ?? []}
          />
        </CardContent>
      </Card>
    </>
  );
}
