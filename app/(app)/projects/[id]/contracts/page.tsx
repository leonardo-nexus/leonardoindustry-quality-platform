import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { FileSignature, ShieldAlert, Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createServerClient } from "@/lib/supabase/server";
import { ProjectStartupBanner } from "@/components/quality/loss-prevention-banner";
import { canStartProject } from "@/lib/quality/loss-prevention";
import { VerifyContractButton, ClauseStatusSelect, NewContractForm, NewClauseForm } from "./contract-actions-ui";
import { ContextualHelp } from "@/components/help/contextual-help";

const SEVERITY_VARIANT: Record<string, "yellow" | "orange" | "red" | "outline"> = {
  info: "outline", attenzione: "yellow", urgente: "orange", critico: "red", blocco: "red",
};
const CONTRACT_STATUS_VARIANT: Record<string, "yellow" | "orange" | "green" | "red" | "gray"> = {
  da_verificare: "orange", in_verifica: "yellow", verificato: "green", approvato: "green",
  contestato: "red", archiviato: "gray",
};

export default async function ProjectContractsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerClient();

  const { data: project } = await supabase
    .from("project").select("id, code, name, company_id, company:company_id(name)")
    .eq("id", id).maybeSingle();
  if (!project) notFound();
  await canStartProject(id);

  const { data: contracts } = await supabase
    .from("contract")
    .select("*, verified:verified_by(first_name,last_name)")
    .eq("project_id", id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  const { data: clauses } = await supabase
    .from("contract_clause")
    .select("*, reviewed:reviewed_by(first_name,last_name)")
    .eq("project_id", id)
    .is("deleted_at", null)
    .order("severity", { ascending: false });

  return (
    <>
      <PageHeader
        title={`Contratti — ${project.code}`}
        description={`${(project as any).company?.name} · ${project.name} · lettura, verifica, clausole critiche`}
        actions={
          <div className="flex gap-2">
            <Button asChild variant="outline"><Link href={`/projects/${id}/technical-sheets`}>Schede tecniche</Link></Button>
            <Button asChild variant="outline"><Link href={`/projects/${id}/materials`}>Materiali</Link></Button>
            <Button asChild variant="outline"><Link href={`/projects/${id}`}>← Commessa</Link></Button>
          </div>
        }
      />

      <ProjectStartupBanner projectId={id} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Contratti */}
          {(contracts ?? []).length === 0 ? (
            <Card className="leo-card border-status-red/30">
              <CardContent className="p-6 text-center">
                <FileSignature className="mx-auto h-8 w-8 text-status-red mb-2" />
                <p className="text-sm text-status-red font-medium">Nessun contratto registrato per questa commessa</p>
                <p className="text-xs text-leo-muted mt-1">Carica il contratto per sbloccare l'avvio commessa →</p>
              </CardContent>
            </Card>
          ) : (
            (contracts ?? []).map((c: any) => (
              <Card key={c.id} className="leo-card">
                <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
                  <div>
                    <CardTitle className="text-base">{c.code} · {c.title}</CardTitle>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-leo-muted">
                      <span>Cliente: {c.client_name ?? "—"}</span>
                      {c.contract_date && <span>· firmato {format(new Date(c.contract_date), "dd/MM/yyyy")}</span>}
                      {c.value_euro && <span>· {Number(c.value_euro).toLocaleString("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}</span>}
                    </div>
                  </div>
                  <Badge variant={CONTRACT_STATUS_VARIANT[c.status] ?? "outline"}>{c.status.replace(/_/g, " ")}</Badge>
                </CardHeader>
                <CardContent className="space-y-3">
                  {c.penalty_clauses && (
                    <div className="rounded-md border border-status-orange/30 bg-status-orange/5 p-2 text-xs">
                      <span className="font-semibold text-status-orange">Penali: </span>{c.penalty_clauses}
                    </div>
                  )}
                  {c.status === "da_verificare" || c.status === "in_verifica" ? (
                    <div className="rounded-md border border-status-red/30 bg-status-red/5 p-3 text-sm">
                      <p className="font-medium text-status-red">⚠ Contratto NON verificato</p>
                      <p className="text-xs text-leo-muted mt-1">Finché non viene marcato come verificato, la commessa è bloccata all'avvio (vedi banner sopra).</p>
                      <div className="mt-2">
                        <VerifyContractButton contractId={c.id} projectId={id} />
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-status-green">
                      ✓ Verificato {c.verified_at && format(new Date(c.verified_at), "dd/MM/yyyy HH:mm")} da {c.verified?.first_name} {c.verified?.last_name}
                    </div>
                  )}

                  {/* Clausole di questo contratto */}
                  <div>
                    <h4 className="mb-2 mt-3 text-xs font-semibold uppercase text-leo-muted">Clausole critiche ({(clauses ?? []).filter((cl: any) => cl.contract_id === c.id).length})</h4>
                    <div className="space-y-1">
                      {(clauses ?? []).filter((cl: any) => cl.contract_id === c.id).map((cl: any) => (
                        <div key={cl.id} className="flex flex-wrap items-start gap-2 rounded-md border border-leo-border bg-leo-card/40 px-3 py-2 text-xs">
                          <Badge variant={SEVERITY_VARIANT[cl.severity]} className="text-[10px]">{cl.severity}</Badge>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium">{cl.clause_code ? `[${cl.clause_code}] ` : ""}{cl.clause_title}</div>
                            {cl.obligation && <div className="text-leo-muted">Obbligo: {cl.obligation}</div>}
                            {cl.deadline_date && <div className="text-leo-muted">Scadenza: {format(new Date(cl.deadline_date), "dd/MM/yyyy")}</div>}
                          </div>
                          <ClauseStatusSelect clauseId={cl.id} projectId={id} current={cl.status} />
                        </div>
                      ))}
                      {(clauses ?? []).filter((cl: any) => cl.contract_id === c.id).length === 0 && (
                        <p className="text-xs text-leo-muted italic">Nessuna clausola critica registrata</p>
                      )}
                    </div>
                  </div>

                  <details className="mt-2 rounded-md border border-leo-border">
                    <summary className="cursor-pointer px-3 py-2 text-xs hover:bg-leo-card/40"><Plus className="inline h-3 w-3 mr-1" /> Aggiungi clausola critica</summary>
                    <div className="p-3 border-t border-leo-border">
                      <NewClauseForm contractId={c.id} projectId={id} companyId={project.company_id} />
                    </div>
                  </details>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Colonna destra: nuovo contratto */}
        <div className="space-y-4">
          <Card className="leo-card">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Plus className="h-4 w-4" /> Nuovo contratto</CardTitle>
            </CardHeader>
            <CardContent>
              <NewContractForm projectId={id} companyId={project.company_id} />
            </CardContent>
          </Card>

          <ContextualHelp topicSlug="verifica_contratto" />
          <Card className="leo-card border-status-orange/40">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-status-orange" /> Perché serve</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-leo-muted space-y-2">
              <p>Un contratto non verificato significa <strong>penali sconosciute</strong>, <strong>scadenze ignorate</strong>, <strong>requisiti tecnici fraintesi</strong>.</p>
              <p>La commessa non può partire finché la lettura non è confermata e le clausole critiche sono accettate o chiarite.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
