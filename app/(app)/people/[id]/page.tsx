import { notFound } from "next/navigation";
import { format } from "date-fns";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DeadlineBadge } from "@/components/status/deadline-badge";
import { createServerClient } from "@/lib/supabase/server";
import { CompetenceLinkForm } from "./competence-form";

export default async function PersonDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerClient();
  const { data: person } = await supabase
    .from("person")
    .select("*, company:company_id(name), role:role_id(name)")
    .eq("id", id)
    .maybeSingle();
  if (!person) notFound();

  const { data: competences } = await supabase
    .from("person_competence")
    .select("id, status, issue_date, expiry_date, competence:competence_id(name, category, requires_expiry)")
    .eq("person_id", id);

  const { data: welder } = await supabase
    .from("welder_qualification")
    .select("id, certificate_code, status, expiry_date, welding_process:welding_process_id(code, name)")
    .eq("person_id", id);

  const { data: allCompetences } = await supabase
    .from("competence")
    .select("id, name, category, requires_expiry")
    .order("name");

  return (
    <>
      <PageHeader
        title={`${person.first_name} ${person.last_name}`}
        description={`${(person as any).company?.name} · ${(person as any).role?.name ?? "—"}`}
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Competenze e attestati</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Competenza</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Emissione</TableHead>
                    <TableHead>Scadenza</TableHead>
                    <TableHead>Stato</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(competences ?? []).map((c: any) => (
                    <TableRow key={c.id}>
                      <TableCell>{c.competence?.name}</TableCell>
                      <TableCell><Badge variant="outline">{c.competence?.category}</Badge></TableCell>
                      <TableCell className="text-xs">{c.issue_date ? format(new Date(c.issue_date), "dd/MM/yyyy") : "—"}</TableCell>
                      <TableCell>
                        {c.expiry_date ? <DeadlineBadge dueDate={c.expiry_date} /> : "—"}
                      </TableCell>
                      <TableCell><Badge variant="outline">{c.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                  {(competences?.length ?? 0) === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-4">
                        Nessuna competenza registrata
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          {(welder?.length ?? 0) > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Qualifiche saldatore</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Certificato</TableHead>
                      <TableHead>Processo</TableHead>
                      <TableHead>Scadenza</TableHead>
                      <TableHead>Stato</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(welder ?? []).map((w: any) => (
                      <TableRow key={w.id}>
                        <TableCell className="font-mono text-xs">{w.certificate_code}</TableCell>
                        <TableCell>{w.welding_process?.code} - {w.welding_process?.name}</TableCell>
                        <TableCell><DeadlineBadge dueDate={w.expiry_date} /></TableCell>
                        <TableCell><Badge variant="outline">{w.status}</Badge></TableCell>
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
            <CardTitle>Aggiungi competenza</CardTitle>
          </CardHeader>
          <CardContent>
            <CompetenceLinkForm personId={id} competences={allCompetences ?? []} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
