"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertOctagon, Lock, AlertTriangle, X, ShieldAlert } from "lucide-react";
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

const SESSION_KEY = "qsentinel:popups_dismissed";

function readDismissed(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
}

function writeDismissed(set: Set<string>) {
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
  const [pending, setPending] = useState<QualityPopupItem[]>([]);
  const [current, setCurrent] = useState<QualityPopupItem | null>(null);

  useEffect(() => {
    const dismissed = readDismissed();
    const remaining = items.filter((i) => !dismissed.has(`${i.kind}:${i.id}`));
    setPending(remaining);
    if (remaining.length > 0) setCurrent(remaining[0]);
  }, [items]);

  function dismissCurrent() {
    if (!current) return;
    const dismissed = readDismissed();
    dismissed.add(`${current.kind}:${current.id}`);
    writeDismissed(dismissed);
    const rest = pending.filter((p) => p.id !== current.id);
    setPending(rest);
    setCurrent(rest[0] ?? null);
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
              <span className="ml-auto text-xs text-leo-muted">{remaining} avvisi attivi</span>
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
              Rischio economico stimato: {Number(current.estimated_loss_euro).toLocaleString("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}
            </div>
          )}
        </DialogHeader>
        <DialogFooter className="flex-row justify-end gap-2 sm:gap-2">
          <Button variant="ghost" size="sm" onClick={dismissCurrent}>
            <X className="mr-1 h-3 w-3" /> Ricorda dopo
          </Button>
          <Button asChild size="sm">
            <Link href={current.action_url} onClick={dismissCurrent}>
              Vai a risolvere →
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
