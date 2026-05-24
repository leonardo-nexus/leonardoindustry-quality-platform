import Link from "next/link";
import { format } from "date-fns";
import { ShieldAlert, FileWarning, Lock, TrendingDown, AlertOctagon, Activity } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createServerClient } from "@/lib/supabase/server";

const CATEGORY_LABEL: Record<string, string> = {
  contratto_non_verificato: "Contratto non verificato",
  clausola_critica_aperta: "Clausola critica aperta",
  scheda_tecnica_mancante: "Scheda tecnica mancante",
  materiale_non_certificato: "Materiale non certificato",
  documento_obsoleto: "Documento obsoleto",
  ritardo_fornitore: "Ritardo fornitore",
  cantiere_fermo: "Cantiere fermo",
  collaudo_mancante: "Collaudo mancante",
  dossier_incompleto: "Dossier CE incompleto",
  rilavorazione: "Rilavorazione",
  altro: "Altro",
};

const SEVERITY_VARIANT: Record<string, "yellow" | "orange" | "red" | "outline"> = {
  info: "outline",
  attenzione: "yellow",
  urgente: "orange",
  critico: "red",
  blocco: "red",
};

export default async function RiskDashboardPage() {
  const supabase = await createServerClient();

  const [
    { data: openEvents, count: openCount },
    { data: blockedProjects },
    { data: unverifiedContracts },
    { data: criticalClauses },
    { data: missingTechSheets },
    { data: blockedMaterials },
    { data: topCauses },
  ] = await Promise.all([
    supabase.from("loss_event").select("id, category, severity, title, description, estimated_loss_euro, estimated_loss_days, due_date, status, project:project_id(code, name), company:company_id(name)", { count: "exact" }).neq("status", "risolto").neq("status", "archiviato").order("severity", { ascending: false }).limit(50),
    supabase.from("project_startup_check").select("project_id, last_check_at, project:project_id(code, name, company:company_id(name))").eq("is_unlocked", false).limit(20),
    supabase.from("contract").select("id, code, title, client_name, project:project_id(code), company:company_id(name)").in("status", ["da_verificare", "in_verifica"]).is("deleted_at", null).limit(20),
    supabase.from("contract_clause").select("id, clause_title, risk_type, severity, project:project_id(code), contract:contract_id(code)").in("severity", ["urgente", "critico", "blocco"]).in("status", ["da_chiarire", "non_accettata"]).is("deleted_at", null).limit(20),
    supabase.from("technical_sheet").select("id, code, title, status, project:project_id(code)").eq("status", "da_approvare").is("deleted_at", null).limit(20),
    supabase.from("material_lot").select("id, lot_code, material_description, status, block_reason, project:project_id(code)").eq("status", "bloccato").is("deleted_at", null).limit(20),
    supabase.from("loss_event").select("category").neq("status", "risolto"),
  ]);

  // Aggregate top 5 cause perdita tempo
  const causeCounter: Record<string, number> = {};
  (topCauses ?? []).forEach((e) => { causeCounter[e.category] = (causeCounter[e.category] ?? 0) + 1; });
  const top5 = Object.entries(causeCounter).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const totalLossEuro = (openEvents ?? []).reduce((s, e: any) => s + (Number(e.estimated_loss_euro) || 0), 0);
  const totalLossDays = (openEvents ?? []).reduce((s, e: any) => s + (Number(e.estimated_loss_days) || 0), 0);

  return (
    <>
      <PageHeader
        title="Dashboard rischio economico"
        description="Loss Prevention — cosa sta facendo perdere soldi e tempo al gruppo, in tempo reale"
        actions={
          <Button asChild variant="outline"><Link href="/quality-sentinel">← Quality Sentinel</Link></Button>
        }
      />

      {/* KPI principali */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="leo-card border-status-red/40">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-leo-muted"><TrendingDown className="h-3 w-3" /> Perdita stimata aperta</div>
            <div className="mt-1 text-2xl font-bold text-status-red">{totalLossEuro.toLocaleString("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}</div>
          </CardContent>
        </Card>
        <Card className="leo-card border-status-orange/40">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-leo-muted"><Activity className="h-3 w-3" /> Giorni persi stimati</div>
            <div className="mt-1 text-2xl font-bold text-status-orange">{totalLossDays.toFixed(1)}</div>
          </CardContent>
        </Card>
        <Card className="leo-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-leo-muted"><AlertOctagon className="h-3 w-3" /> Eventi aperti</div>
            <div className="mt-1 text-2xl font-bold">{openCount ?? 0}</div>
          </CardContent>
        </Card>
        <Card className="leo-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-leo-muted"><Lock className="h-3 w-3" /> Commesse bloccate</div>
            <div className="mt-1 text-2xl font-bold">{blockedProjects?.length ?? 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Top 5 cause perdita tempo */}
      <Card className="leo-card mb-6">
        <CardHeader><CardTitle className="text-base">Top 5 cause perdita tempo aperte</CardTitle></CardHeader>
        <CardContent>
          {top5.length === 0 ? (
            <p className="text-sm text-status-green">✓ Nessuna causa di perdita aperta</p>
          ) : (
            <ul className="space-y-1.5">
              {top5.map(([cat, n]) => (
                <li key={cat} className="flex items-center justify-between rounded-md border border-leo-border bg-leo-card/40 px-3 py-2 text-sm">
                  <span>{CATEGORY_LABEL[cat] ?? cat}</span>
                  <Badge variant="orange">{n} eventi</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Commesse bloccate */}
        <Card className="leo-card border-status-red/30">
          <CardHeader><CardTitle className="flex items-center gap-2"><Lock className="h-4 w-4 text-status-red" /> Commesse bloccate (no avvio)</CardTitle></CardHeader>
          <CardContent className="space-y-1.5">
            {(blockedProjects?.length ?? 0) === 0 ? (
              <p className="text-sm text-status-green">✓ Tutte le commesse possono essere avviate</p>
            ) : (
              (blockedProjects ?? []).map((b: any) => (
                <Link key={b.project_id} href={`/projects/${b.project_id}`} className="flex items-center justify-between rounded-md border border-status-red/30 bg-status-red/5 px-3 py-2 text-sm hover:bg-status-red/10">
                  <div>
                    <div className="font-medium">{b.project?.code} · {b.project?.name}</div>
                    <div className="text-xs text-leo-muted">{b.project?.company?.name}</div>
                  </div>
                  <Badge variant="red" className="text-[10px]">bloccata</Badge>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        {/* Contratti non verificati */}
        <Card className="leo-card border-status-orange/30">
          <CardHeader><CardTitle className="flex items-center gap-2"><FileWarning className="h-4 w-4 text-status-orange" /> Contratti non verificati</CardTitle></CardHeader>
          <CardContent className="space-y-1.5">
            {(unverifiedContracts?.length ?? 0) === 0 ? (
              <p className="text-sm text-status-green">✓ Tutti i contratti verificati</p>
            ) : (
              (unverifiedContracts ?? []).map((c: any) => (
                <div key={c.id} className="rounded-md border border-status-orange/30 bg-status-orange/5 px-3 py-2 text-sm">
                  <div className="font-medium">{c.code} · {c.title}</div>
                  <div className="text-xs text-leo-muted">{c.company?.name} · cliente {c.client_name ?? "—"} · {c.project?.code ?? "—"}</div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Clausole critiche aperte */}
        <Card className="leo-card border-status-red/30">
          <CardHeader><CardTitle className="flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-status-red" /> Clausole critiche aperte</CardTitle></CardHeader>
          <CardContent className="space-y-1.5">
            {(criticalClauses?.length ?? 0) === 0 ? (
              <p className="text-sm text-status-green">✓ Nessuna clausola critica aperta</p>
            ) : (
              (criticalClauses ?? []).map((c: any) => (
                <div key={c.id} className="rounded-md border border-status-red/30 bg-status-red/5 px-3 py-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant={SEVERITY_VARIANT[c.severity]} className="text-[10px]">{c.severity}</Badge>
                    <span className="font-medium">{c.clause_title}</span>
                  </div>
                  <div className="text-xs text-leo-muted">contratto {c.contract?.code ?? "—"} · {c.project?.code ?? "—"} · rischio {c.risk_type}</div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Schede tecniche non approvate */}
        <Card className="leo-card border-status-orange/30">
          <CardHeader><CardTitle className="flex items-center gap-2"><FileWarning className="h-4 w-4 text-status-orange" /> Schede tecniche non approvate</CardTitle></CardHeader>
          <CardContent className="space-y-1.5">
            {(missingTechSheets?.length ?? 0) === 0 ? (
              <p className="text-sm text-status-green">✓ Tutte le schede tecniche approvate</p>
            ) : (
              (missingTechSheets ?? []).map((s: any) => (
                <div key={s.id} className="rounded-md border border-status-orange/30 bg-status-orange/5 px-3 py-2 text-sm">
                  <div className="font-medium">{s.code} · {s.title}</div>
                  <div className="text-xs text-leo-muted">{s.project?.code ?? "—"}</div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Materiali bloccati */}
        <Card className="leo-card border-status-red/30 lg:col-span-2">
          <CardHeader><CardTitle className="flex items-center gap-2"><Lock className="h-4 w-4 text-status-red" /> Materiali bloccati (non utilizzabili)</CardTitle></CardHeader>
          <CardContent className="space-y-1.5">
            {(blockedMaterials?.length ?? 0) === 0 ? (
              <p className="text-sm text-status-green">✓ Nessun materiale bloccato</p>
            ) : (
              (blockedMaterials ?? []).map((m: any) => (
                <div key={m.id} className="rounded-md border border-status-red/30 bg-status-red/5 px-3 py-2 text-sm">
                  <div className="font-medium">Lotto {m.lot_code} · {m.material_description ?? "—"}</div>
                  <div className="text-xs text-leo-muted">{m.project?.code ?? "—"} · motivo blocco: {m.block_reason ?? "—"}</div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Feed loss_event */}
        <Card className="leo-card lg:col-span-2">
          <CardHeader><CardTitle className="flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-status-red" /> Feed Loss Prevention — eventi aperti</CardTitle></CardHeader>
          <CardContent className="space-y-1.5">
            {(openEvents?.length ?? 0) === 0 ? (
              <p className="text-sm text-status-green">✓ Nessun evento Loss Prevention attivo</p>
            ) : (
              (openEvents ?? []).map((e: any) => (
                <div key={e.id} className="rounded-md border border-leo-border bg-leo-card/40 px-3 py-2 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant={SEVERITY_VARIANT[e.severity]} className="text-[10px]">{e.severity}</Badge>
                      <span className="font-medium">{e.title}</span>
                    </div>
                    {e.estimated_loss_euro && (
                      <span className="text-xs font-medium text-status-red">
                        {Number(e.estimated_loss_euro).toLocaleString("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-leo-muted">
                    {CATEGORY_LABEL[e.category] ?? e.category} · {e.company?.name} {e.project?.code && `· ${e.project.code}`}
                    {e.due_date && ` · scadenza ${format(new Date(e.due_date), "dd/MM/yyyy")}`}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
