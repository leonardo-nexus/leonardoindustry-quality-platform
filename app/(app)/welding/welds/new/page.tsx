import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { createServerClient } from "@/lib/supabase/server";
import { WeldForm } from "../weld-form";

export default async function NewWeldPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createServerClient();
  const [{ data: projects }, { data: drawings }, { data: execClasses }, { data: wpsList }, { data: welders }, { data: materials }] = await Promise.all([
    supabase.from("project").select("id, code, name").order("code"),
    supabase.from("drawing").select("id, code, revision, project_id, status").eq("status", "attivo"),
    supabase.from("execution_class").select("id, code").order("code"),
    supabase.from("wps").select("id, code, revision, welding_process_id").eq("status", "valida"),
    supabase.from("person").select("id, first_name, last_name").order("last_name"),
    supabase.from("material_lot").select("id, heat_number, material_grade, project_id, status").eq("status", "disponibile"),
  ]);
  return (
    <>
      <PageHeader
        title="Nuova saldatura"
        description="Tutta la catena (commessa, disegno approvato, WPS valida con WPQR, saldatore qualificato, materiale) verrà verificata al cambio di stato a 'autorizzata'"
      />
      <Card>
        <CardContent className="p-6">
          <WeldForm
            defaultProjectId={params.project}
            projects={projects ?? []}
            drawings={drawings ?? []}
            execClasses={execClasses ?? []}
            wpsList={wpsList ?? []}
            welders={welders ?? []}
            materials={materials ?? []}
          />
        </CardContent>
      </Card>
    </>
  );
}
