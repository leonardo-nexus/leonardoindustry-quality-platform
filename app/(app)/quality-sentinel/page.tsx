import Link from "next/link";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import {
  Shield, AlertTriangle, ClipboardCheck, FileX, Lock, Activity, CheckCircle2,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createServerClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { computeQualityScore, SCORE_LEVEL_TONE } from "@/lib/quality/score";
import { CompanyScoreChart, StatusDonut } from "@/components/quality/quality-charts";
import { QualityCoach } from "@/components/quality/quality-coach";

export default async function QualitySentinelPage() {
  const supabase = await createServerClient();

  const [
    { count: openBlocks },
    { count: criticalBlocks },
    { count: openChecklists },
    { count: overdueChecklists },
    { count: missingDocs },
    { count: openRequests },
    { count: openNc },
    { count: criticalNc },
    { count: activePlans },
    { data: recentEvents },
    { data: topBlocks },
    { data: companies },
    { data: checklistByStatus },
    { data: ncBySeverity },
    { data: projectsData },
    { data: wpsData },
  ] = await Promise.all([
    supabase.from("quality_block").select("id", { count: "exact", head: true }).eq("status", "aperto").eq("active", true),
    supabase.from("quality_block").select("id", { count: "exact", head: true }).eq("status", "aperto").in("severity", ["critical","block"]).eq("active", true),
    supabase.from("quality_checklist").select("id", { count: "exact", head: true }).in("status", ["non_avviata","in_corso"]).eq("active", true),
    supabase.from("quality_checklist").select("id", { count: "exact", head: true }).eq("status", "scaduta").eq("active", true),
    supabase.from("quality_document_requirement").select("id", { count: "exact", head: true }).eq("status", "mancante").eq("active", true),
    supabase.from("quality_request").select("id", { count: "exact", head: true }).in("status", ["inviata","sollecitata","in_verifica"]).eq("active", true),
    supabase.from("non_conformity").select("id", { count: "exact", head: true }).neq("status", "chiusa").eq("active", true),
    supabase.from("non_conformity").select("id", { count: "exact", head: true }).neq("status", "chiusa").eq("severity", "critica").eq("active", true),
    supabase.from("quality_plan").select("id", { count: "exact", head: true }).eq("status", "attivo").eq("active", true),
    supabase.from("quality_event_log").select("event_type, message, created_at, company:company_id(name)").order("created_at", { ascending: false }).limit(12),
    supabase.from("quality_block").select("id, type, severity, description, opened_at, company:company_id(name), project:project_id(code,name)").eq("status", "aperto").eq("active", true).order("opened_at", { ascending: false }).limit(5),
    supabase.from("company").select("id, name").eq("active", true).order("name"),
    supabase.from("quality_checklist").select("status").eq("active", true),
    supabase.from("non_conformity").select("severity").neq("status", "chiusa").eq("active", true),
    supabase.from("project").select("id, status").eq("active", true),
    supabase.from("wps").select("status").eq("active", true),
  ]);

  const groupScore = computeQualityScore({
    checklist_total: (openChecklists ?? 0) + (overdueChecklists ?? 0) + 1,
    checklist_completed: 1,
    checklist_overdue: overdueChecklists ?? 0,
    tasks_total: 1, tasks_on_time: 1, tasks_overdue: 0,
    documents_required: (missingDocs ?? 0) + 5,
    documents_ok: 5,
    documents_missing: missingDocs ?? 0,
    documents_expired: 0,
    nc_total: Math.max(openNc ?? 1, 1),
    nc_closed_effective: 0,
    nc_critical_open: criticalNc ?? 0,
    evidence_total: 1, evidence_valid: 1,
    blocks_open: openBlocks ?? 0,
    audits_planned: 1, audits_executed: 1,
  });
  const tone = SCORE_LEVEL_TONE[groupScore.level];

  const companyScores = await Promise.all(
    (companies ?? []).map(async (c) => {
      const [{ count: chOver }, { count: nc }, { count: ncCrit }, { count: bl }] = await Promise.all([
        supabase.from("quality_block").select("id", { count: "exact", head: true }).eq("company_id", c.id).eq("severity", "critical"),
        supabase.from("non_conformity").select("id", { count: "exact", head: true }).eq("company_id", c.id).neq("status", "chiusa"),
        supabase.from("non_conformity").select("id", { count: "exact", head: true }).eq("company_id", c.id).eq("severity", "critica").neq("status", "chiusa"),
        supabase.from("quality_block").select("id", { count: "exact", head: true }).eq("company_id", c.id).eq("status", "aperto"),
      ]);
      const s = computeQualityScore({
        checklist_total: 10, checklist_completed: 10 - (chOver ?? 0), checklist_overdue: chOver ?? 0,
        tasks_total: 1, tasks_on_time: 1, tasks_overdue: 0,
        documents_required: 5, documents_ok: 5, documents_missing: 0, documents_expired: 0,
        nc_total: Math.max(nc ?? 1, 1), nc_closed_effective: 0, nc_critical_open: ncCrit ?? 0,
        evidence_total: 1, evidence_valid: 1, blocks_open: bl ?? 0,
        audits_planned: 1, audits_executed: 1,
      });
      return { name: c.name, score: s.score };
    }),
  );

  const aggregate = (rows: any[] | null, key: string) => {
    const counts: Record<string, number> = {};
    (rows ?? []).forEach((r) => counts[r[key]] = (counts[r[key]] ?? 0) + 1);
    return Object.entries(counts).map(([name, value]) => ({ name: name.replace(/_/g, " "), value }));
  };
  const checklistAgg = aggregate(checklistByStatus, "status");
  const ncAgg = aggregate(ncBySeverity, "severity");
  const projectsAgg = aggregate(projectsData, "status");
  const wpsAgg = aggregate(wpsData, "status");

  return (
    <>
      <PageHeader
        title="Quality Sentinel"
        description="Quality Control Operating System · indice qualità · grafici · coach operativo · feed eventi"
        actions={
          <div className="flex gap-2">
            <Button asChild variant="outline"><Link href="/notifications">Notifiche</Link></Button>
            <Button asChild variant="outline" className="border-status-red/40 text-status-red hover:bg-status-red/10"><Link href="/quality-sentinel/risk">⚠ Rischio economico</Link></Button>
            <Button asChild variant="outline"><Link href="/quality-sentinel/reports">Report criticità</Link></Button>
            <Button asChild><Link href="/quality-sentinel/executive">Vista direzione</Link></Button>
          </div>
        }
      />

      <Card className={cn("leo-card mb-6 border-2", tone.bg)}>
        <CardContent className="p-6">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-4">
              <Shield className={cn("h-12 w-12", tone.color)} />
              <div>
                <div className="text-xs uppercase tracking-wider text-leo-muted">Indice qualità gruppo Leonardoindustry</div>
                <div className={cn("text-5xl font-bold", tone.color)}>{groupScore.score}<span className="text-2xl text-leo-muted">/100</span></div>
                <div className={cn("text-sm font-semibold", tone.color)}>{tone.label}</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center sm:grid-cols-7">
              {Object.entries(groupScore.components).map(([k, v]) => (
                <div key={k} className="px-3"><div className="text-xs text-leo-muted capitalize">{k}</div><div className="font-bold">{v}</div></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mb-6"><QualityCoach /></div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Card className={cn("leo-card", (criticalBlocks ?? 0) > 0 ? "border-status-red/40 bg-status-red/5" : "")}><CardContent className="p-4 text-center"><Lock className={cn("mx-auto mb-1 h-5 w-5", (criticalBlocks ?? 0) > 0 ? "text-status-red" : "text-leo-muted")} /><div className="text-2xl font-bold">{openBlocks ?? 0}</div><div className="text-xs text-leo-muted">Blocchi</div></CardContent></Card>
        <Card className="leo-card"><CardContent className="p-4 text-center"><ClipboardCheck className="mx-auto mb-1 h-5 w-5 text-brand-cyan" /><div className="text-2xl font-bold">{openChecklists ?? 0}</div><div className="text-xs text-leo-muted">Checklist aperte</div></CardContent></Card>
        <Card className={cn("leo-card", (missingDocs ?? 0) > 0 ? "border-status-orange/40 bg-status-orange/5" : "")}><CardContent className="p-4 text-center"><FileX className={cn("mx-auto mb-1 h-5 w-5", (missingDocs ?? 0) > 0 ? "text-status-orange" : "text-leo-muted")} /><div className="text-2xl font-bold">{missingDocs ?? 0}</div><div className="text-xs text-leo-muted">Docs mancanti</div></CardContent></Card>
        <Card className="leo-card"><CardContent className="p-4 text-center"><Activity className="mx-auto mb-1 h-5 w-5 text-brand-green" /><div className="text-2xl font-bold">{openRequests ?? 0}</div><div className="text-xs text-leo-muted">Richieste</div></CardContent></Card>
        <Card className={cn("leo-card", (criticalNc ?? 0) > 0 ? "border-status-red/40 bg-status-red/5" : "")}><CardContent className="p-4 text-center"><AlertTriangle className={cn("mx-auto mb-1 h-5 w-5", (criticalNc ?? 0) > 0 ? "text-status-red" : "text-status-orange")} /><div className="text-2xl font-bold">{openNc ?? 0}</div><div className="text-xs text-leo-muted">NC aperte</div></CardContent></Card>
        <Card className="leo-card"><CardContent className="p-4 text-center"><Shield className="mx-auto mb-1 h-5 w-5 text-brand-blue" /><div className="text-2xl font-bold">{activePlans ?? 0}</div><div className="text-xs text-leo-muted">Piani attivi</div></CardContent></Card>
      </div>

      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-leo-muted">Quality Intelligence</h2>
      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="leo-card"><CardHeader><CardTitle className="text-base">Indice qualità per impresa</CardTitle></CardHeader><CardContent><CompanyScoreChart data={companyScores} /></CardContent></Card>
        <Card className="leo-card"><CardHeader><CardTitle className="text-base">Stato checklist</CardTitle></CardHeader><CardContent><StatusDonut data={checklistAgg} /></CardContent></Card>
        <Card className="leo-card"><CardHeader><CardTitle className="text-base">NC per gravità</CardTitle></CardHeader><CardContent><StatusDonut data={ncAgg} /></CardContent></Card>
        <Card className="leo-card"><CardHeader><CardTitle className="text-base">Stato commesse</CardTitle></CardHeader><CardContent><StatusDonut data={projectsAgg} /></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="leo-card lg:col-span-2">
          <CardHeader><CardTitle className="flex items-center gap-2"><Lock className="h-4 w-4 text-status-red" /> Blocchi operativi attivi</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(topBlocks?.length ?? 0) === 0 ? (
              <p className="flex items-center gap-2 text-sm text-status-green"><CheckCircle2 className="h-4 w-4" /> Nessun blocco operativo.</p>
            ) : (
              (topBlocks ?? []).map((b: any) => (
                <div key={b.id} className="flex items-center justify-between rounded-md border border-status-red/30 bg-status-red/5 px-3 py-2 text-sm">
                  <div className="flex-1">
                    <Badge variant="red" className="text-[10px] mr-2">{b.severity}</Badge>
                    <span className="font-medium">{b.type.replace(/_/g, " ")}</span>
                    {b.project && <span className="ml-2 text-xs text-leo-muted">{b.project.code}</span>}
                    {b.description && <p className="text-xs text-leo-muted mt-0.5">{b.description}</p>}
                  </div>
                  <span className="text-[10px] text-leo-muted">{format(new Date(b.opened_at), "dd/MM HH:mm")}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card className="leo-card">
          <CardHeader><CardTitle className="flex items-center gap-2"><Activity className="h-4 w-4 text-brand-cyan" /> Feed eventi qualità</CardTitle></CardHeader>
          <CardContent className="space-y-2 max-h-96 overflow-y-auto">
            {(recentEvents ?? []).map((e: any, i) => (
              <div key={i} className="border-l-2 border-brand-cyan/40 pl-3 py-1 text-xs">
                <div className="text-leo-muted">{format(new Date(e.created_at), "dd/MM HH:mm", { locale: it })}</div>
                <div className="font-medium">{e.message}</div>
                {e.company && <div className="text-[10px] text-leo-muted">{e.company.name}</div>}
              </div>
            ))}
            {(recentEvents?.length ?? 0) === 0 && <p className="text-sm text-leo-muted">Nessun evento registrato.</p>}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
