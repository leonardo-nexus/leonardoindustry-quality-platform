import Link from "next/link";
import { AlertOctagon, ShieldAlert } from "lucide-react";
import { createServerClient } from "@/lib/supabase/server";

export interface LossPreventionItem {
  label: string;
  detail: string;
  action_url: string;
  severity: "critico" | "blocco";
}

/**
 * Banner permanente in cima a una pagina critica: lista cosa manca, perché blocca,
 * dove andare. Sparisce solo quando i problemi sono risolti.
 */
export function LossPreventionBanner({ items, title }: { items: LossPreventionItem[]; title?: string }) {
  if (items.length === 0) return null;
  const hasBlock = items.some((i) => i.severity === "blocco");
  return (
    <div
      role="alert"
      className={`risk-loss-banner mb-4 rounded-md px-4 py-3 ${hasBlock ? "alert-critical-pulse" : ""}`}
    >
      <div className="flex items-start gap-3">
        <ShieldAlert className="h-6 w-6 shrink-0 text-status-red" aria-hidden />
        <div className="flex-1">
          <div className="flex items-center gap-2 text-status-red">
            <span className="text-sm font-bold uppercase tracking-wide">
              {title ?? (hasBlock ? "BLOCCO LOSS PREVENTION" : "ATTENZIONE LOSS PREVENTION")}
            </span>
            <span className="text-xs text-leo-muted">· {items.length} {items.length === 1 ? "controllo" : "controlli"} aperti</span>
          </div>
          <ul className="mt-2 space-y-1 text-sm">
            {items.map((i, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <AlertOctagon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-status-red" aria-hidden />
                <span className="flex-1">
                  <span className="font-medium">{i.label}</span>
                  <span className="ml-2 text-leo-muted">{i.detail}</span>
                </span>
                <Link href={i.action_url} className="ml-2 shrink-0 rounded border border-status-red/40 bg-status-red/10 px-2 py-0.5 text-xs font-medium text-status-red hover:bg-status-red/20">
                  Vai →
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/**
 * Server component: legge gli ostacoli all'avvio commessa e mostra il banner.
 */
export async function ProjectStartupBanner({ projectId }: { projectId: string }) {
  const supabase = await createServerClient();
  const { data: chk } = await supabase
    .from("project_startup_check")
    .select("*")
    .eq("project_id", projectId)
    .maybeSingle();
  if (!chk || chk.is_unlocked) return null;

  const items: LossPreventionItem[] = [];
  if (!chk.contract_uploaded) items.push({ label: "Contratto non caricato", detail: "richiesto prima dell'avvio commessa", action_url: `/projects/${projectId}/contracts`, severity: "blocco" });
  if (!chk.contract_verified) items.push({ label: "Contratto non verificato", detail: "responsabile qualità deve confermare lettura", action_url: `/projects/${projectId}/contracts`, severity: "blocco" });
  if (!chk.contract_read_checklist_done) items.push({ label: "Checklist lettura contratto incompleta", detail: "FMT-CON-01 da compilare", action_url: `/projects/${projectId}/contracts`, severity: "blocco" });
  if (!chk.critical_clauses_reviewed) items.push({ label: "Clausole critiche non analizzate", detail: "FMT-CON-02 mancante o aperto", action_url: `/projects/${projectId}/contracts`, severity: "blocco" });
  if (!chk.quality_plan_generated) items.push({ label: "Piano qualità non generato", detail: "manca selezione template + generazione", action_url: `/projects/${projectId}/quality-plan`, severity: "blocco" });
  if (!chk.quality_responsible_assigned) items.push({ label: "Responsabile qualità non assegnato", detail: "obbligatorio per avvio", action_url: `/projects/${projectId}`, severity: "critico" });
  if (!chk.technical_sheets_uploaded) items.push({ label: "Schede tecniche non caricate", detail: "almeno una scheda materiale richiesta", action_url: `/projects/${projectId}/technical-sheets`, severity: "critico" });

  return <LossPreventionBanner items={items} title="BLOCCO AVVIO COMMESSA" />;
}
