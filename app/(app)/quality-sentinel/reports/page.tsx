import { format } from "date-fns";
import Link from "next/link";
import { FileWarning, AlertTriangle, Lock, Calendar } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createServerClient } from "@/lib/supabase/server";
import { RunEscalationsButton } from "./run-button";
import { getT, getCurrentLocale } from "@/lib/i18n/dictionary";

export default async function ReportsPage() {
  const supabase = await createServerClient();
  const t = await getT();
  const locale = await getCurrentLocale();
  const today = new Date().toISOString().slice(0, 10);
  const in7 = new Date(); in7.setDate(in7.getDate() + 7);
  const iso7 = in7.toISOString().slice(0, 10);

  const [
    { data: overdueChecklists },
    { data: blockedProjects },
    { data: missingDocs },
    { data: openNc },
    { data: lateRequests },
  ] = await Promise.all([
    supabase.from("quality_checklist").select("id, code, title, status, due_date, responsible:responsible_id(first_name,last_name), phase:plan_phase_id(plan:plan_id(project:project_id(code, company:company_id(name))))").eq("status", "scaduta").limit(50),
    supabase.from("project").select("id, code, name, status, company:company_id(name)").eq("active", true),
    supabase.from("quality_document_requirement").select("id, code, title, due_date, plan:plan_id(project:project_id(code, company:company_id(name)))").eq("status", "mancante").limit(50),
    supabase.from("non_conformity").select("id, code, title, severity, detected_at, responsible:responsible_id(first_name, last_name), company:company_id(name), project:project_id(code)").neq("status", "chiusa").order("detected_at").limit(50),
    supabase.from("quality_request").select("id, subject, due_date, recipient:recipient_person_id(first_name, last_name), company:company_id(name)").lt("due_date", today).in("status", ["inviata","sollecitata"]).limit(30),
  ]);

  return (
    <>
      <PageHeader
        title={locale === "es" ? "Informes de criticidad calidad" : "Report criticità qualità"}
        description={locale === "es" ? "Qué no funciona · quién debe actuar · cuándo · riesgo si no se hace" : "Cosa non va · chi deve agire · entro quando · rischio se non fatto"}
        actions={
          <div className="flex gap-2">
            <RunEscalationsButton />
            <Button asChild variant="outline"><Link href="/quality-sentinel">← {t("qs.title")}</Link></Button>
          </div>
        }
      />

      <div className="space-y-6">
        {/* Checklist scadute */}
        <Card className="leo-card">
          <CardHeader><CardTitle className="flex items-center gap-2"><Calendar className="h-4 w-4 text-status-red" /> Checklist scadute ({overdueChecklists?.length ?? 0})</CardTitle></CardHeader>
          <CardContent className="space-y-1.5">
            {(overdueChecklists ?? []).map((c: any) => (
              <Link key={c.id} href={`/quality-sentinel/checklists/${c.id}`} className="flex items-center justify-between rounded-md border border-status-red/20 bg-status-red/5 px-3 py-2 text-sm hover:bg-status-red/10">
                <div>
                  <span className="font-mono text-xs text-brand-cyan">{c.code}</span>
                  <span className="ml-2">{c.title}</span>
                  <p className="text-xs text-leo-muted">{c.phase?.plan?.project?.company?.name} · {c.phase?.plan?.project?.code}</p>
                </div>
                <div className="text-right text-xs">
                  <div className="text-status-red">scaduta {c.due_date ? format(new Date(c.due_date), "dd/MM") : "—"}</div>
                  <div className="text-leo-muted">{c.responsible?.first_name} {c.responsible?.last_name}</div>
                </div>
              </Link>
            ))}
            {(overdueChecklists?.length ?? 0) === 0 && <p className="text-sm text-status-green">✓ Nessuna checklist scaduta</p>}
          </CardContent>
        </Card>

        {/* Documenti mancanti */}
        <Card className="leo-card">
          <CardHeader><CardTitle className="flex items-center gap-2"><FileWarning className="h-4 w-4 text-status-orange" /> Documenti mancanti ({missingDocs?.length ?? 0})</CardTitle></CardHeader>
          <CardContent className="space-y-1.5">
            {(missingDocs ?? []).map((d: any) => (
              <div key={d.id} className="flex items-center justify-between rounded-md border border-status-orange/20 bg-status-orange/5 px-3 py-2 text-sm">
                <div>
                  <span className="font-mono text-xs text-brand-cyan">{d.code}</span>
                  <span className="ml-2">{d.title}</span>
                  <p className="text-xs text-leo-muted">{d.plan?.project?.company?.name} · {d.plan?.project?.code}</p>
                </div>
                {d.due_date && <Badge variant="orange" className="text-[10px]">scadenza {format(new Date(d.due_date), "dd/MM")}</Badge>}
              </div>
            ))}
            {(missingDocs?.length ?? 0) === 0 && <p className="text-sm text-status-green">✓ Tutti i documenti richiesti sono presenti</p>}
          </CardContent>
        </Card>

        {/* NC aperte */}
        <Card className="leo-card">
          <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-status-red" /> Non conformità aperte ({openNc?.length ?? 0})</CardTitle></CardHeader>
          <CardContent className="space-y-1.5">
            {(openNc ?? []).slice(0, 20).map((nc: any) => (
              <Link key={nc.id} href={`/non-conformities/${nc.id}`} className="flex items-center justify-between rounded-md border border-status-orange/20 bg-status-orange/5 px-3 py-2 text-sm hover:bg-status-orange/10">
                <div>
                  <Badge variant={nc.severity === "critica" ? "red" : nc.severity === "maggiore" ? "orange" : "yellow"} className="text-[10px] mr-2">{nc.severity}</Badge>
                  <span className="font-medium">{nc.title}</span>
                  <p className="text-xs text-leo-muted">{nc.company?.name} {nc.project && `· ${nc.project.code}`} · {nc.responsible?.first_name} {nc.responsible?.last_name}</p>
                </div>
                <span className="text-[10px] text-leo-muted">{format(new Date(nc.detected_at), "dd/MM/yy")}</span>
              </Link>
            ))}
            {(openNc?.length ?? 0) === 0 && <p className="text-sm text-status-green">✓ Nessuna NC aperta</p>}
          </CardContent>
        </Card>

        {/* Richieste scadute */}
        <Card className="leo-card">
          <CardHeader><CardTitle className="flex items-center gap-2"><Lock className="h-4 w-4 text-status-red" /> Richieste documentali scadute ({lateRequests?.length ?? 0})</CardTitle></CardHeader>
          <CardContent className="space-y-1.5">
            {(lateRequests ?? []).map((r: any) => (
              <div key={r.id} className="flex items-center justify-between rounded-md border border-status-red/20 bg-status-red/5 px-3 py-2 text-sm">
                <div>
                  <span className="font-medium">{r.subject}</span>
                  <p className="text-xs text-leo-muted">{r.company?.name} · {r.recipient?.first_name} {r.recipient?.last_name}</p>
                </div>
                <Badge variant="red" className="text-[10px]">scaduta {format(new Date(r.due_date), "dd/MM")}</Badge>
              </div>
            ))}
            {(lateRequests?.length ?? 0) === 0 && <p className="text-sm text-status-green">✓ Nessuna richiesta scaduta</p>}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
