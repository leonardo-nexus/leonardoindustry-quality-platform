import Link from "next/link";
import { Plus } from "lucide-react";
import { format } from "date-fns";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createServerClient } from "@/lib/supabase/server";

const STATUS_VARIANT: Record<string, "blue" | "yellow" | "green" | "gray"> = {
  pianificato: "blue",
  eseguito: "yellow",
  chiuso: "green",
};

export default async function AuditsPage() {
  const supabase = await createServerClient();
  const { data: audits } = await supabase
    .from("audit")
    .select("id, code, audit_type, planned_date, executed_date, status, company:company_id(name), standard:standard_id(code), process:process_id(name), lead_auditor:lead_auditor_id(first_name,last_name)")
    .order("planned_date", { ascending: false })
    .limit(200);

  return (
    <>
      <PageHeader
        title="Audit"
        description="Audit interni, esterni, cliente, fornitore, FPC"
        actions={
          <Button asChild><Link href="/audits/new"><Plus className="h-4 w-4" /> Nuovo audit</Link></Button>
        }
      />
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Codice</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Impresa</TableHead>
                <TableHead>Norma</TableHead>
                <TableHead>Data prevista</TableHead>
                <TableHead>Data esecuzione</TableHead>
                <TableHead>Lead auditor</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(audits ?? []).map((a: any) => (
                <TableRow key={a.id}>
                  <TableCell className="font-mono text-xs">{a.code ?? "—"}</TableCell>
                  <TableCell><Badge variant="outline">{a.audit_type}</Badge></TableCell>
                  <TableCell className="text-xs">{a.company?.name}</TableCell>
                  <TableCell className="text-xs">{a.standard?.code ?? "—"}</TableCell>
                  <TableCell className="text-xs">{format(new Date(a.planned_date), "dd/MM/yyyy")}</TableCell>
                  <TableCell className="text-xs">{a.executed_date ? format(new Date(a.executed_date), "dd/MM/yyyy") : "—"}</TableCell>
                  <TableCell className="text-xs">{a.lead_auditor ? `${a.lead_auditor.first_name} ${a.lead_auditor.last_name}` : "—"}</TableCell>
                  <TableCell><Badge variant={STATUS_VARIANT[a.status] ?? "gray"}>{a.status}</Badge></TableCell>
                  <TableCell><Button asChild variant="ghost" size="sm"><Link href={`/audits/${a.id}`}>Apri</Link></Button></TableCell>
                </TableRow>
              ))}
              {(audits?.length ?? 0) === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-sm text-muted-foreground py-8">
                    Nessun audit pianificato.
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
