import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createServerClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";
import { NewQualForm } from "./form";

export default async function NewQualificationPage({ searchParams }: { searchParams: Promise<{ erp_supplier_id?: string }> }) {
  const sp = await searchParams;
  const session = await requireSession();
  const supabase = await createServerClient();
  const { data: companies } = await supabase.from("company").select("id, name").eq("active", true).order("name");
  return (
    <>
      <PageHeader
        title="Nuova qualifica fornitore · FMT-FOR-01"
        description={sp.erp_supplier_id ? `Pre-popolata da ERP supplier ${sp.erp_supplier_id}` : "Compila anagrafica + 13 sezioni"}
        actions={<Button asChild variant="outline"><Link href="/suppliers/qualification">← Lista</Link></Button>}
      />
      <Card className="leo-card max-w-3xl">
        <CardContent className="p-6">
          <NewQualForm companies={companies ?? []} defaultCompanyId={session.person?.company_id ?? ""} erpId={sp.erp_supplier_id ?? ""} />
        </CardContent>
      </Card>
    </>
  );
}
