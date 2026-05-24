import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createServerClient } from "@/lib/supabase/server";
import { AuditTrailPanel } from "@/components/audit/audit-trail-panel";
import { ActionForm } from "./action-form";
import { NcCloseButton } from "./nc-close-button";
import { NcEditPanel } from "./nc-edit-panel";

const ACTION_STATUS_VARIANT: Record<string, "blue" | "yellow" | "green" | "red"> = {
  aperta: "blue",
  in_corso: "yellow",
  completata: "blue",
  efficace: "green",
  non_efficace: "red",
};

export default async function NcDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerClient();

  const { data: nc } = await supabase
    .from("non_conformity")
    .select("*, company:company_id(id, name), process:process_id(name), responsible:responsible_id(id, first_name, last_name)")
    .eq("id", id)
    .maybeSingle();
  if (!nc) notFound();

  const { data: actions } = await supabase
    .from("corrective_action")
    .select("id, title, due_date, status, responsible:responsible_id(first_name,last_name)")
    .eq("non_conformity_id", id)
    .order("due_date");

  const { data: people } = await supabase.from("person").select("id, first_name, last_name").order("last_name");

  return (
    <>
      <PageHeader
        title={`${(nc as any).code ?? "NC"} · ${nc.title}`}
        description={`${(nc as any).company?.name} · ${(nc as any).process?.name ?? "—"} · gravità ${nc.severity}`}
        actions={<NcCloseButton ncId={id} currentStatus={nc.status} />}
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Dettagli</CardTitle>
            </CardHeader>
            <CardContent>
              <NcEditPanel nc={nc} />
              <div className="mt-4 text-xs text-leo-muted">
                Rilevata il {format(new Date(nc.detected_at), "dd/MM/yyyy")}
              </div>
            </CardContent>
          </Card>
          <AuditTrailPanel entityType="non_conformity" entityId={id} showRevisions={false} />
          <Card>
            <CardHeader>
              <CardTitle>Azioni correttive collegate</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Titolo</TableHead>
                    <TableHead>Responsabile</TableHead>
                    <TableHead>Scadenza</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(actions ?? []).map((a: any) => (
                    <TableRow key={a.id}>
                      <TableCell>{a.title}</TableCell>
                      <TableCell className="text-xs">{a.responsible ? `${a.responsible.first_name} ${a.responsible.last_name}` : "—"}</TableCell>
                      <TableCell className="text-xs">{format(new Date(a.due_date), "dd/MM/yyyy")}</TableCell>
                      <TableCell><Badge variant={ACTION_STATUS_VARIANT[a.status] ?? "gray"}>{a.status}</Badge></TableCell>
                      <TableCell><Link className="text-sm underline" href={`/actions/${a.id}`}>Apri</Link></TableCell>
                    </TableRow>
                  ))}
                  {(actions?.length ?? 0) === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-4">
                        Nessuna azione collegata — apri la prima per chiudere la NC
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Apri azione correttiva</CardTitle>
          </CardHeader>
          <CardContent>
            <ActionForm
              ncId={id}
              companyId={(nc as any).company.id}
              people={people ?? []}
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
