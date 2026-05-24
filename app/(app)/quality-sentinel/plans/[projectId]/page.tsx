import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { Shield, FileText, ClipboardCheck, AlertCircle, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createServerClient } from "@/lib/supabase/server";
import { GeneratePlanForm } from "./generate-plan-form";

const PHASE_STATUS_VARIANT: Record<string, "gray" | "yellow" | "red" | "green"> = {
  non_avviata: "gray",
  in_corso: "yellow",
  bloccata: "red",
  completata: "green",
  non_conforme: "red",
};

export default async function ProjectQualityPlanPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const supabase = await createServerClient();

  const { data: project } = await supabase
    .from("project")
    .select("id, code, name, status, company:company_id(name), execution_class:execution_class_id(code)")
    .eq("id", projectId)
    .maybeSingle();
  if (!project) notFound();

  const { data: plan } = await supabase
    .from("quality_plan")
    .select("*, template:template_id(id, code, name, country, norms), responsible:responsible_qa_id(first_name, last_name)")
    .eq("project_id", projectId)
    .maybeSingle();

  // Se non c'è piano, mostra form di generazione
  if (!plan) {
    const { data: templates } = await supabase
      .from("quality_template")
      .select("id, code, name, kind, country, norms")
      .eq("active", true)
      .order("name");
    return (
      <>
        <PageHeader
          title={`Piano qualità — ${project.code}`}
          description={`${(project as any).company?.name} · ${project.name}`}
          actions={
            <Button asChild variant="outline">
              <Link href={`/projects/${projectId}`}>← Commessa</Link>
            </Button>
          }
        />
        <Card className="leo-card max-w-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-brand-cyan" /> Genera piano qualità
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-leo-muted">
              Seleziona un template per generare automaticamente fasi, checklist e richieste documentali per questa commessa.
            </p>
            <GeneratePlanForm projectId={projectId} templates={templates ?? []} />
          </CardContent>
        </Card>
      </>
    );
  }

  // Carica fasi del piano
  const { data: phases } = await supabase
    .from("quality_plan_phase")
    .select("*")
    .eq("plan_id", plan.id)
    .order("ordering");

  // Carica checklist
  const { data: checklists } = await supabase
    .from("quality_checklist")
    .select("id, code, title, status, due_date, plan_phase_id, responsible:responsible_id(first_name, last_name)")
    .in("plan_phase_id", (phases ?? []).map((p) => p.id));

  // Carica document_requirement
  const { data: docReqs } = await supabase
    .from("quality_document_requirement")
    .select("id, code, title, status, due_date")
    .eq("plan_id", plan.id);

  return (
    <>
      <PageHeader
        title={`Piano qualità — ${project.code}`}
        description={`${(project as any).company?.name} · ${(plan as any).template?.name ?? "Custom"} · paese ${plan.country}`}
        actions={
          <Button asChild variant="outline">
            <Link href={`/projects/${projectId}`}>← Commessa</Link>
          </Button>
        }
      />

      {/* Riepilogo */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="leo-card">
          <CardContent className="p-4 text-center">
            <div className="text-xs text-leo-muted">Stato piano</div>
            <Badge variant="outline" className="mt-1">{plan.status}</Badge>
          </CardContent>
        </Card>
        <Card className="leo-card">
          <CardContent className="p-4 text-center">
            <div className="text-xs text-leo-muted">Fasi</div>
            <div className="text-2xl font-bold">{phases?.length ?? 0}</div>
          </CardContent>
        </Card>
        <Card className="leo-card">
          <CardContent className="p-4 text-center">
            <div className="text-xs text-leo-muted">Checklist totali</div>
            <div className="text-2xl font-bold">{checklists?.length ?? 0}</div>
          </CardContent>
        </Card>
        <Card className="leo-card">
          <CardContent className="p-4 text-center">
            <div className="text-xs text-leo-muted">Documenti richiesti</div>
            <div className="text-2xl font-bold">{docReqs?.length ?? 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Fasi con relative checklist */}
      <div className="space-y-6">
        {(phases ?? []).map((ph) => {
          const phaseChecklists = (checklists ?? []).filter((c: any) => c.plan_phase_id === ph.id);
          return (
            <Card key={ph.id} className="leo-card">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base">
                  <span>
                    <span className="text-leo-muted text-sm mr-2">#{ph.ordering}</span>
                    {ph.name}
                  </span>
                  <Badge variant={PHASE_STATUS_VARIANT[ph.status] ?? "gray"}>{ph.status.replace(/_/g, " ")}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {phaseChecklists.length === 0 ? (
                  <p className="text-xs text-leo-muted">Nessuna checklist per questa fase.</p>
                ) : (
                  <div className="space-y-1.5">
                    {phaseChecklists.map((c: any) => (
                      <Link key={c.id} href={`/quality-sentinel/checklists/${c.id}`}
                        className="flex items-center justify-between rounded-md bg-leo-card/40 px-3 py-2 text-sm hover:bg-leo-card">
                        <span>
                          <ClipboardCheck className="inline h-3.5 w-3.5 mr-2 text-brand-cyan" />
                          <span className="font-mono text-xs text-brand-cyan">{c.code}</span>
                          <span className="ml-2">{c.title}</span>
                          {c.due_date && <span className="ml-2 text-xs text-leo-muted">scad. {format(new Date(c.due_date), "dd/MM")}</span>}
                        </span>
                        <div className="flex items-center gap-2">
                          {c.responsible && (
                            <span className="text-xs text-leo-muted">{c.responsible.first_name} {c.responsible.last_name}</span>
                          )}
                          <Badge variant={PHASE_STATUS_VARIANT[c.status] ?? "gray"} className="text-[10px]">{c.status.replace(/_/g, " ")}</Badge>
                          <ArrowRight className="h-3 w-3 text-leo-muted" />
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {(docReqs?.length ?? 0) > 0 && (
        <Card className="leo-card mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 text-brand-green" /> Documenti richiesti
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {(docReqs ?? []).map((d: any) => (
              <div key={d.id} className="flex items-center justify-between rounded-md bg-leo-card/40 px-3 py-2 text-sm">
                <span>
                  <span className="font-mono text-xs text-brand-cyan">{d.code}</span>
                  <span className="ml-2">{d.title}</span>
                </span>
                <Badge variant={d.status === "mancante" ? "red" : d.status === "verificato" ? "green" : "yellow"}>{d.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </>
  );
}
