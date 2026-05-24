import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { createServerClient } from "@/lib/supabase/server";
import { PersonForm } from "../person-form";

export default async function NewPersonPage() {
  const supabase = await createServerClient();
  const [{ data: companies }, { data: roles }] = await Promise.all([
    supabase.from("company").select("id, name").order("name"),
    supabase.from("role").select("id, name").order("name"),
  ]);
  return (
    <>
      <PageHeader title="Nuova persona" />
      <Card>
        <CardContent className="p-6">
          <PersonForm companies={companies ?? []} roles={roles ?? []} />
        </CardContent>
      </Card>
    </>
  );
}
