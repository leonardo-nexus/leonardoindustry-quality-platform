import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createServerClient } from "@/lib/supabase/server";
import { FindingForm } from "./finding-form";

const FINDING_VARIANT: Record<string, "blue" | "yellow" | "orange" | "red" | "green"> = {
  osservazione: "blue",
  raccomandazione: "yellow",
  non_conformita_minore: "orange",
  non_conformita_maggiore: "red",
  punto_forte: "green",
};

export default async function AuditDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerClient();
  const { data: audit } = await supabase
    .from("audit")
    .select("*, company:company_id(name), standard:standard_id(code), process:process_id(name), lead_auditor:lead_auditor_id(first_name,last_name)")
    .eq("id", id)
    .maybeSingle();
  if (!audit) notFound();

  const { data: findings } = await supabase
    .from("audit_finding")
    .select("id, finding_type, description, created_at")
    .eq("audit_id", id)
    .order("created_at");

  const { data: ncs } = await supabase
    .from("non_conformity")
    .select("id, code, title, severity, status")
    .eq("audit_id", id)
    .order("created_at");

  return (
    <>
      <PageHeader
        title={`Audit ${(audit as any).code ?? audit.audit_type.toUpperCase()}`}
        description={`${(audit as any).company?.name} · ${(audit as any).standard?.code ?? "—"} · prevista ${format(new Date(audit.planned_date), "dd/MM/yyyy")}`}
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Rilievi e osservazioni</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descrizione</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(findings ?? []).map((f) => (
                    <TableRow key={f.id}>
                      <TableCell>
                        <Badge variant={FINDING_VARIANT[f.finding_type] ?? "gray"}>{f.finding_type}</Badge>
                      </TableCell>
                      <TableCell>{f.description}</TableCell>
                    </TableRow>
                  ))}
                  {(findings?.length ?? 0) === 0 && (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-xs text-muted-foreground py-4">
                        Nessun rilievo registrato
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          {(ncs?.length ?? 0) > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Non conformità generate</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Codice</TableHead>
                      <TableHead>Titolo</TableHead>
                      <TableHead>Gravità</TableHead>
                      <TableHead>Stato</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(ncs ?? []).map((nc) => (
                      <TableRow key={nc.id}>
                        <TableCell className="font-mono text-xs">{nc.code ?? "—"}</TableCell>
                        <TableCell>{nc.title}</TableCell>
                        <TableCell><Badge variant="outline">{nc.severity}</Badge></TableCell>
                        <TableCell><Badge variant="outline">{nc.status}</Badge></TableCell>
                        <TableCell>
                          <Link className="text-sm underline" href={`/non-conformities/${nc.id}`}>Apri</Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Aggiungi rilievo</CardTitle>
          </CardHeader>
          <CardContent>
            <FindingForm auditId={id} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
