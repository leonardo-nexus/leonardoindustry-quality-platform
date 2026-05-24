import { format } from "date-fns";
import { Edit3, Plus, Trash2, GitBranch, Lock, Unlock, FileSignature, CheckCircle2, XCircle, Upload, Download, RotateCcw, Archive } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getEntityHistory, type AuditAction } from "@/lib/audit/audit-log";
import { getRevisionHistory } from "@/lib/audit/revisions";

const ACTION_META: Record<AuditAction, { Icon: any; label: string; color: string }> = {
  create:    { Icon: Plus,         label: "Creato",        color: "text-status-green" },
  update:    { Icon: Edit3,        label: "Modificato",    color: "text-brand-cyan" },
  delete:    { Icon: Trash2,       label: "Eliminato",     color: "text-status-red" },
  restore:   { Icon: RotateCcw,    label: "Ripristinato",  color: "text-status-green" },
  approve:   { Icon: CheckCircle2, label: "Approvato",     color: "text-status-green" },
  reject:    { Icon: XCircle,      label: "Respinto",      color: "text-status-red" },
  archive:   { Icon: Archive,      label: "Archiviato",    color: "text-status-orange" },
  revise:    { Icon: GitBranch,    label: "Nuova rev.",    color: "text-brand-cyan" },
  complete:  { Icon: CheckCircle2, label: "Completato",    color: "text-status-green" },
  block:     { Icon: Lock,         label: "Bloccato",      color: "text-status-red" },
  unblock:   { Icon: Unlock,       label: "Sbloccato",     color: "text-status-green" },
  sign:      { Icon: FileSignature,label: "Firmato",       color: "text-brand-cyan" },
  upload:    { Icon: Upload,       label: "Caricato",      color: "text-status-green" },
  download:  { Icon: Download,     label: "Scaricato",     color: "text-leo-muted" },
  import:    { Icon: Upload,       label: "Importato",     color: "text-status-green" },
  export:    { Icon: Download,     label: "Esportato",     color: "text-leo-muted" },
  escalate:  { Icon: Lock,         label: "Escalation",    color: "text-status-orange" },
  dismiss:   { Icon: XCircle,      label: "Ignorato",      color: "text-leo-muted" },
  snooze:    { Icon: RotateCcw,    label: "Posticipato",   color: "text-status-yellow" },
};

/** Server component: storico audit + revisioni di un'entità */
export async function AuditTrailPanel({
  entityType,
  entityId,
  showRevisions = true,
}: {
  entityType: string;
  entityId: string;
  showRevisions?: boolean;
}) {
  const [history, revisions] = await Promise.all([
    getEntityHistory(entityType, entityId, 50),
    showRevisions ? getRevisionHistory(entityType, entityId) : Promise.resolve([]),
  ]);

  return (
    <Card className="leo-card">
      <CardHeader>
        <CardTitle className="text-base">Storico e revisioni</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {showRevisions && revisions.length > 0 && (
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase text-leo-muted">Revisioni</h4>
            <div className="space-y-1.5">
              {revisions.map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-md border border-leo-border bg-leo-card/40 px-3 py-2 text-xs">
                  <div className="flex items-center gap-2">
                    <Badge variant={r.is_current ? "green" : "outline"} className="text-[10px]">rev {r.revision_number}</Badge>
                    {r.is_current && <span className="text-status-green">corrente</span>}
                    <span className="text-leo-muted">· {format(new Date(r.changed_at), "dd/MM/yyyy HH:mm")}</span>
                  </div>
                  <div className="text-leo-muted">{r.change_reason ?? "—"}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase text-leo-muted">Eventi ({history.length})</h4>
          {history.length === 0 && <p className="text-xs text-leo-muted">Nessun evento registrato</p>}
          <div className="space-y-1">
            {history.map((h) => {
              const meta = ACTION_META[h.action] ?? ACTION_META.update;
              const Icon = meta.Icon;
              return (
                <div key={h.id} className="flex items-start gap-2 rounded-md border border-leo-border/50 px-2 py-1.5 text-xs">
                  <Icon className={`mt-0.5 h-3 w-3 ${meta.color}`} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{meta.label}</span>
                      <span className="text-[10px] uppercase text-leo-muted">{h.source}</span>
                      {h.revision_number && (
                        <Badge variant="outline" className="text-[9px]">rev {h.revision_number}</Badge>
                      )}
                      <span className="ml-auto text-leo-muted">{format(new Date(h.created_at), "dd/MM HH:mm")}</span>
                    </div>
                    <div className="text-leo-muted">
                      {h.user_full_name ?? h.user_email ?? "—"}
                      {h.changed_fields && h.changed_fields.length > 0 && (
                        <> · campi: <code className="text-[10px]">{h.changed_fields.join(", ")}</code></>
                      )}
                    </div>
                    {h.reason && <div className="mt-0.5 italic text-leo-muted">"{h.reason}"</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
