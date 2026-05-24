import Link from "next/link";
import { AlertOctagon, ShieldAlert } from "lucide-react";

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
 * Usa canStartProject che ora include i gate fornitore.
 */
export async function ProjectStartupBanner({ projectId }: { projectId: string }) {
  const { canStartProject, blockersToBannerItems } = await import("@/lib/quality/loss-prevention");
  const gate = await canStartProject(projectId);
  if (gate.blockers.length === 0) return null;

  return <LossPreventionBanner items={blockersToBannerItems(gate.blockers)} title={gate.is_unlocked ? "ATTENZIONE COMMESSA" : "BLOCCO AVVIO COMMESSA"} />;
}
