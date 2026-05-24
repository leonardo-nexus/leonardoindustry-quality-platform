import Link from "next/link";
import { format } from "date-fns";
import { Shield, AlertTriangle, Lock, TrendingUp, Activity } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createServerClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { computeQualityScore, SCORE_LEVEL_TONE } from "@/lib/quality/score";
import { getT } from "@/lib/i18n/dictionary";

export default async function ExecutivePage() {
  const supabase = await createServerClient();
  const t = await getT();
  const [
    { data: companies },
    { data: blockedProjects },
    { data: criticalNc },
    { data: lateOperators },
    { count: openBlocks },
    { count: criticalBlocks },
    { count: openNcAll },
    { count: missingDocs },
  ] = await Promise.all([
    supabase.from("company").select("id, name, logo_url").eq("active", true).order("name"),
    supabase.from("quality_block").select("id, type, severity, description, opened_at, project:project_id(code, name), company:company_id(name)").eq("status", "aperto").in("severity", ["critical","block"]).order("opened_at", { ascending: false }).limit(10),
    supabase.from("non_conformity").select("id, title, severity, detected_at, project:project_id(code), company:company_id(name)").eq("severity", "critica").neq("status", "chiusa").order("detected_at", { ascending: false }).limit(10),
    supabase.from("task").select("id, title, due_date, responsible:responsible_id(first_name, last_name), company:company_id(name)").lt("due_date", new Date().toISOString().slice(0,10)).neq("status","chiusa").neq("status","verificata").order("due_date").limit(10),
    supabase.from("quality_block").select("id", { count: "exact", head: true }).eq("status", "aperto"),
    supabase.from("quality_block").select("id", { count: "exact", head: true }).eq("status", "aperto").in("severity", ["critical","block"]),
    supabase.from("non_conformity").select("id", { count: "exact", head: true }).neq("status", "chiusa"),
    supabase.from("quality_document_requirement").select("id", { count: "exact", head: true }).eq("status", "mancante"),
  ]);

  // Score per impresa
  const companyScores = await Promise.all(
    (companies ?? []).map(async (c) => {
      const [{ count: ncCrit }, { count: bl }, { count: nc }] = await Promise.all([
        supabase.from("non_conformity").select("id", { count: "exact", head: true }).eq("company_id", c.id).eq("severity", "critica").neq("status", "chiusa"),
        supabase.from("quality_block").select("id", { count: "exact", head: true }).eq("company_id", c.id).eq("status", "aperto"),
        supabase.from("non_conformity").select("id", { count: "exact", head: true }).eq("company_id", c.id).neq("status", "chiusa"),
      ]);
      const s = computeQualityScore({
        checklist_total: 10, checklist_completed: 10 - (bl ?? 0), checklist_overdue: bl ?? 0,
        tasks_total: 1, tasks_on_time: 1, tasks_overdue: 0,
        documents_required: 5, documents_ok: 5, documents_missing: 0, documents_expired: 0,
        nc_total: Math.max(nc ?? 1, 1), nc_closed_effective: 0, nc_critical_open: ncCrit ?? 0,
        evidence_total: 1, evidence_valid: 1, blocks_open: bl ?? 0,
        audits_planned: 1, audits_executed: 1,
      });
      return { ...c, score: s.score, level: s.level, nc, blocks: bl };
    }),
  );
  const sortedByScore = [...companyScores].sort((a, b) => a.score - b.score);
  const worst = sortedByScore.slice(0, 3);

  // Semaforo gruppo
  const avgScore = companyScores.length > 0 ? companyScores.reduce((s, c) => s + c.score, 0) / companyScores.length : 100;
  const semaforoTone =
    (criticalBlocks ?? 0) > 0 ? { color: "bg-status-red", label: "ROSSO — Blocchi critici", desc: `${criticalBlocks} blocchi critici attivi` }
    : avgScore < 60 ? { color: "bg-status-orange", label: "ARANCIONE — Attenzione", desc: "Indice gruppo sotto soglia 60" }
    : avgScore < 75 ? { color: "bg-status-yellow", label: "GIALLO — Monitoraggio", desc: "Indice gruppo da migliorare" }
    : { color: "bg-status-green", label: "VERDE — Sistema sotto controllo", desc: `Indice gruppo: ${avgScore.toFixed(1)}/100` };

  return (
    <>
      <PageHeader
        title={t("qs.executive")}
        description={t("qs.executive_subtitle")}
        actions={
          <Button asChild variant="outline"><Link href="/quality-sentinel">← {t("qs.title")}</Link></Button>
        }
      />

      {/* Semaforo */}
      <Card className="leo-card mb-6">
        <CardContent className="p-6 flex items-center gap-6">
          <div className={cn("h-24 w-24 rounded-full shadow-2xl", semaforoTone.color)} />
          <div>
            <div className="text-2xl font-bold">{semaforoTone.label}</div>
            <div className="text-leo-muted">{semaforoTone.desc}</div>
          </div>
        </CardContent>
      </Card>

      {/* Top criticità */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-6">
        <Card className="leo-card">
          <CardHeader><CardTitle className="flex items-center gap-2"><Lock className="h-4 w-4 text-status-red" /> Blocchi critici attivi</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(blockedProjects?.length ?? 0) === 0 ? (
              <p className="text-sm text-status-green">✓ Nessun blocco critico</p>
            ) : (
              (blockedProjects ?? []).map((b: any) => (
                <div key={b.id} className="rounded-md border border-status-red/30 bg-status-red/5 p-3 text-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <Badge variant="red" className="text-[10px] mr-2">{b.severity}</Badge>
                      <span className="font-medium">{b.type.replace(/_/g, " ")}</span>
                      <p className="text-xs text-leo-muted mt-1">{b.description}</p>
                      <p className="text-xs mt-1">{b.company?.name} · {b.project?.code}</p>
                    </div>
                    <span className="text-[10px] text-leo-muted">{format(new Date(b.opened_at), "dd/MM")}</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="leo-card">
          <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-status-red" /> NC critiche aperte</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(criticalNc?.length ?? 0) === 0 ? (
              <p className="text-sm text-status-green">✓ Nessuna NC critica</p>
            ) : (
              (criticalNc ?? []).map((nc: any) => (
                <Link key={nc.id} href={`/non-conformities/${nc.id}`} className="block rounded-md border border-status-red/30 bg-status-red/5 p-3 text-sm hover:bg-status-red/10">
                  <div className="font-medium">{nc.title}</div>
                  <div className="text-xs text-leo-muted">{nc.company?.name} {nc.project && `· ${nc.project.code}`} · rilevata {format(new Date(nc.detected_at), "dd/MM/yyyy")}</div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Imprese peggiori */}
      <Card className="leo-card mb-6">
        <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-status-orange" /> Imprese con indice qualità più basso</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {worst.map((c) => {
              const t = SCORE_LEVEL_TONE[c.level];
              return (
                <div key={c.id} className={cn("rounded-md border-2 p-4", t.bg)}>
                  <div className="font-medium mb-1">{c.name}</div>
                  <div className={cn("text-3xl font-bold", t.color)}>{c.score}/100</div>
                  <div className="text-xs text-leo-muted mt-1">{t.label}</div>
                  <div className="text-xs mt-2">{c.nc} NC · {c.blocks} blocchi</div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Operatori in ritardo */}
      <Card className="leo-card">
        <CardHeader><CardTitle className="flex items-center gap-2"><Activity className="h-4 w-4 text-status-orange" /> Task scaduti — Top responsabili in ritardo</CardTitle></CardHeader>
        <CardContent>
          {(lateOperators?.length ?? 0) === 0 ? (
            <p className="text-sm text-status-green">✓ Nessun task scaduto</p>
          ) : (
            <ul className="space-y-1.5">
              {(lateOperators ?? []).map((t: any) => (
                <li key={t.id} className="flex items-center justify-between rounded-md bg-leo-card/40 px-3 py-2 text-sm">
                  <div>
                    <span className="font-medium">{t.title}</span>
                    <span className="ml-2 text-xs text-leo-muted">{t.company?.name}</span>
                  </div>
                  <div className="flex gap-2 items-center">
                    <span className="text-xs text-leo-muted">{t.responsible?.first_name} {t.responsible?.last_name}</span>
                    <Badge variant="red" className="text-[10px]">scaduto {format(new Date(t.due_date), "dd/MM")}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}
