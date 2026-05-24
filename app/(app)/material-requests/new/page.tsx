import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createServerClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";
import { NewMaterialRequestForm } from "./form";

export default async function NewMaterialRequestPage() {
  const session = await requireSession();
  const supabase = await createServerClient();
  const [{ data: projects }, { data: sheets }] = await Promise.all([
    supabase.from("project").select("id, code, name").eq("active", true).eq("company_id", session.person?.company_id ?? "").order("code"),
    supabase.from("technical_sheet").select("id, code, title, status").is("deleted_at", null).limit(100),
  ]);

  return (
    <>
      <PageHeader
        title="Nuova richiesta materiale"
        description="Codice, descrizione, quantità, destinazione, scheda tecnica"
        actions={<Button asChild variant="outline"><Link href="/material-requests">← Richieste</Link></Button>}
      />
      <Card className="leo-card max-w-3xl">
        <CardContent className="p-6">
          <NewMaterialRequestForm
            companyId={session.person?.company_id ?? ""}
            projects={projects ?? []}
            sheets={sheets ?? []}
          />
        </CardContent>
      </Card>
    </>
  );
}
