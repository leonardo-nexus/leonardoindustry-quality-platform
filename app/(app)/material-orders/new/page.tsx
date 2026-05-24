import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createServerClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";
import { NewOrderForm } from "./form";

export default async function NewOrderPage({ searchParams }: { searchParams: Promise<{ material_request_id?: string }> }) {
  const sp = await searchParams;
  const session = await requireSession();
  const supabase = await createServerClient();
  const companyId = session.person?.company_id ?? "";

  let req: any = null;
  if (sp.material_request_id) {
    const { data } = await supabase.from("material_request").select("*, project:project_id(id, code, name)").eq("id", sp.material_request_id).maybeSingle();
    req = data;
  }
  const { data: projects } = await supabase.from("project").select("id, code, name").eq("active", true).eq("company_id", companyId).order("code");

  return (
    <>
      <PageHeader
        title="Nuovo ordine materiale"
        description={req ? `Da richiesta ${req.request_code}` : "Crea ordine fornitore"}
        actions={<Button asChild variant="outline"><Link href="/material-orders">← Ordini</Link></Button>}
      />
      <Card className="leo-card max-w-3xl">
        <CardContent className="p-6">
          <NewOrderForm
            companyId={companyId}
            projects={projects ?? []}
            sourceRequest={req}
          />
        </CardContent>
      </Card>
    </>
  );
}
