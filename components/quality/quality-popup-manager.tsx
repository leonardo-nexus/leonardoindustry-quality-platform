"use client";
import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { AlertOctagon, Lock, AlertTriangle, X, ShieldAlert, Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { dismissPopupAction, snoozePopupAction } from "@/app/actions/popup-dismissal";
import { useT } from "@/lib/i18n/client";

export interface QualityPopupItem {
  id: string;
  kind: "block" | "request_overdue" | "nc_critical" | "loss_prevention";
  severity: string;
  title: string;
  description: string | null;
  action_url: string;
  company_name: string | null;
  project_code: string | null;
  opened_at: string;
  estimated_loss_euro?: number | null;
}

// I dismiss/snooze sono persistiti server-side in popup_dismissal con audit_log.
// In client serve solo un cache di sessione per non rishowarli subito senza refresh.
const SESSION_KEY = "qsentinel:popups_dismissed_local";

function readDismissedLocal(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
}

function writeDismissedLocal(set: Set<string>) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(Array.from(set)));
  } catch {}
}

const KIND_META = {
  block: { Icon: Lock, color: "text-status-red", border: "border-status-red", label: "BLOCCO OPERATIVO" },
  nc_critical: { Icon: AlertOctagon, color: "text-status-red", border: "border-status-red", label: "NC CRITICA APERTA" },
  request_overdue: { Icon: AlertTriangle, color: "text-status-orange", border: "border-status-orange", label: "RICHIESTA SCADUTA" },
  loss_prevention: { Icon: ShieldAlert, color: "text-status-red", border: "border-status-red", label: "RISCHIO ECONOMICO" },
} as const;

export function QualityPopupManager({ items }: { items: QualityPopupItem[] }) {
  const { t } = useT();
  const [pending, setPending] = useState<QualityPopupItem[]>([]);
  const [current, setCurrent] = useState<QualityPopupItem | null>(null);
  const [showDismissForm, setShowDismissForm] = useState(false);
  const [dismissReason, setDismissReason] = useState("");
  const [isSubmitting, startTransition] = useTransition();

  useEffect(() => {
    const dismissed = readDismissedLocal();
    const remaining = items.filter((i) => !dismissed.has(`${i.kind}:${i.id}`));
    setPending(remaining);
    if (remaining.length > 0) setCurrent(remaining[0]);
  }, [items]);

  function advanceToNext() {
    if (!current) return;
    const dismissed = readDismissedLocal();
    dismissed.add(`${current.kind}:${current.id}`);
    writeDismissedLocal(dismissed);
    const rest = pending.filter((p) => p.id !== current.id);
    setPending(rest);
    setCurrent(rest[0] ?? null);
    setShowDismissForm(false);
    setDismissReason("");
  }

  function submitDismiss() {
    if (!current) return;
    if (dismissReason.trim().length < 3) {
      toast.error("Motivo obbligatorio (min 3 caratteri) per ignorare un alert critico");
      return;
    }
    startTransition(async () => {
      const r = await dismissPopupAction(current.kind, current.id, dismissReason.trim());
      if (r?.error) toast.error(r.error);
      else { toast.success("Alert ignorato e tracciato in audit log"); advanceToNext(); }
    });
  }

  function snoozeCurrent(hours: number) {
    if (!current) return;
    startTransition(async () => {
      const r = await snoozePopupAction(current.kind, current.id, hours);
      if (r?.error) toast.error(r.error);
      else { toast.success(`Snooze ${hours}h registrato`); advanceToNext(); }
    });
  }

  // dismissCurrent = solo "ricorda dopo" senza motivo: snooze 4h
  function dismissCurrent() {
    snoozeCurrent(4);
  }

  if (!current) return null;
  const meta = KIND_META[current.kind];
  const Icon = meta.Icon;
  const remaining = pending.length;

  return (
    <Dialog open={!!current} onOpenChange={(o) => !o && dismissCurrent()}>
      <DialogContent className={`max-w-md border-2 ${meta.border} bg-leo-card ${current.kind === "loss_prevention" || current.kind === "block" ? "alert-critical-pulse" : ""}`}>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Icon className={`h-6 w-6 ${meta.color}`} />
            <Badge variant="red" className="text-[10px]">{meta.label}</Badge>
            {remaining > 1 && (
              <span className="ml-auto text-xs text-leo-muted">{t("popup.remaining", { count: remaining })}</span>
            )}
          </div>
          <DialogTitle className="mt-3 text-base">{current.title}</DialogTitle>
          {current.description && (
            <DialogDescription className="whitespace-pre-line text-sm">
              {current.description}
            </DialogDescription>
          )}
          <div className="mt-2 text-xs text-leo-muted">
            {current.company_name && <span>{current.company_name}</span>}
            {current.project_code && <span> · {current.project_code}</span>}
            <span> · da {new Date(current.opened_at).toLocaleDateString("it-IT")}</span>
          </div>
          {current.estimated_loss_euro != null && (
            <div className="mt-2 rounded-md border border-status-red/40 bg-status-red/10 px-3 py-2 text-sm font-medium text-status-red">
              {t("popup.estimated_loss")}: {Number(current.estimated_loss_euro).toLocaleString("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}
            </div>
          )}
        </DialogHeader>
        {showDismissForm ? (
          <div className="space-y-2 border-t border-leo-border pt-3">
            <label className="block text-xs text-leo-muted">{t("popup.reason_to_dismiss")}</label>
            <Textarea rows={2} value={dismissReason} onChange={(e) => setDismissReason(e.target.value)} />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowDismissForm(false)} disabled={isSubmitting}>{t("actions.cancel")}</Button>
              <Button size="sm" variant="destructive" onClick={submitDismiss} disabled={isSubmitting}>{t("popup.confirm_dismiss")}</Button>
            </div>
          </div>
        ) : (
          <DialogFooter className="flex-row justify-end gap-2 sm:gap-2">
            <Button variant="ghost" size="sm" onClick={() => snoozeCurrent(4)} disabled={isSubmitting}>
              <Clock className="mr-1 h-3 w-3" /> {t("popup.snooze_4h")}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => snoozeCurrent(24)} disabled={isSubmitting}>
              <Clock className="mr-1 h-3 w-3" /> {t("popup.snooze_24h")}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowDismissForm(true)} disabled={isSubmitting} className="text-status-red">
              <X className="mr-1 h-3 w-3" /> {t("actions.dismiss_with_reason")}
            </Button>
            <Button asChild size="sm">
              <Link href={current.action_url} onClick={() => snoozeCurrent(1)}>
                {t("actions.go_to_resolve")} →
              </Link>
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
