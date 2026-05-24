import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CompanyLogo } from "@/components/layout/company-logo";
import { createServerClient } from "@/lib/supabase/server";

export default async function CompaniesPage() {
  const supabase = await createServerClient();
  const { data: companies } = await supabase
    .from("company")
    .select("id, name, legal_name, country, tax_id, active, logo_url")
    .order("name");

  return (
    <>
      <PageHeader
        title="Imprese del gruppo"
        description="Anagrafica delle 9 imprese del gruppo Leonardoindustry"
        actions={
          <Button asChild>
            <Link href="/companies/new">
              <Plus className="h-4 w-4" /> Nuova impresa
            </Link>
          </Button>
        }
      />
      <Card className="leo-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14"></TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Ragione sociale</TableHead>
                <TableHead>Paese</TableHead>
                <TableHead>P.IVA / CIF</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(companies ?? []).map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <CompanyLogo name={c.name} logoUrl={c.logo_url} size="sm" />
                  </TableCell>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>{c.legal_name ?? "—"}</TableCell>
                  <TableCell>{c.country ?? "—"}</TableCell>
                  <TableCell>{c.tax_id ?? "—"}</TableCell>
                  <TableCell>
                    {c.active ? <Badge variant="green">Attiva</Badge> : <Badge variant="gray">Inattiva</Badge>}
                  </TableCell>
                  <TableCell>
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/companies/${c.id}`}>Apri</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {(companies?.length ?? 0) === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
                    Nessuna impresa. Crea la prima per iniziare.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
