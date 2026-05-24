import { notFound } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createServerClient } from "@/lib/supabase/server";
import { CompanyForm } from "../company-form";
import { updateCompanyAction } from "../actions";
import { SiteForm } from "./site-form";
import { LogoUpload } from "../logo-upload";

const SITE_TYPE_LABEL: Record<string, string> = {
  sede: "Sede",
  officina: "Officina",
  cantiere: "Cantiere",
  magazzino: "Magazzino",
};

export default async function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerClient();
  const { data: company } = await supabase.from("company").select("*").eq("id", id).maybeSingle();
  if (!company) notFound();

  const { data: sites } = await supabase
    .from("site")
    .select("id, type, name, address, active")
    .eq("company_id", id)
    .order("type, name");

  return (
    <>
      <PageHeader
        title={company.name}
        description={`Impresa del gruppo Leonardoindustry${company.country ? ` · ${company.country}` : ""}`}
      />

      <div className="mb-6">
        <Card className="leo-card">
          <CardHeader>
            <CardTitle>Logo aziendale</CardTitle>
          </CardHeader>
          <CardContent>
            <LogoUpload
              companyId={id}
              companyName={company.name}
              currentLogoUrl={company.logo_url ?? null}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="leo-card">
            <CardHeader>
              <CardTitle>Dati impresa</CardTitle>
            </CardHeader>
            <CardContent>
              <CompanyForm
                defaults={company}
                action={updateCompanyAction.bind(null, id)}
                submitLabel="Aggiorna"
              />
            </CardContent>
          </Card>
        </div>

        <Card className="leo-card">
          <CardHeader>
            <CardTitle>Sedi e cantieri</CardTitle>
          </CardHeader>
          <CardContent>
            <SiteForm companyId={id} />
            <Table className="mt-4">
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Nome</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(sites ?? []).map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <Badge variant="outline">{SITE_TYPE_LABEL[s.type] ?? s.type}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{s.name}</div>
                      {s.address && <div className="text-xs text-leo-muted">{s.address}</div>}
                    </TableCell>
                  </TableRow>
                ))}
                {(sites?.length ?? 0) === 0 && (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-xs text-leo-muted py-4">
                      Nessuna sede registrata
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
