"use client";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { EditToolbar } from "@/components/audit/edit-toolbar";
import { genericUpdateAction, genericDeleteAction } from "@/lib/audit/generic-actions";

const SEVERITY_OPTS = ["minore", "maggiore", "critica"];
const STATUS_OPTS = ["aperta", "in_corso", "in_verifica", "chiusa"];

export function NcEditPanel({ nc }: { nc: any }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(nc.title ?? "");
  const [description, setDescription] = useState(nc.description ?? "");
  const [severity, setSeverity] = useState(nc.severity ?? "minore");
  const [status, setStatus] = useState(nc.status ?? "aperta");

  function reset() {
    setTitle(nc.title ?? "");
    setDescription(nc.description ?? "");
    setSeverity(nc.severity ?? "minore");
    setStatus(nc.status ?? "aperta");
    setEditing(false);
  }

  return (
    <div className="space-y-3">
      <EditToolbar
        isEditing={editing}
        onEdit={() => setEditing(true)}
        onCancel={reset}
        reasonRequired
        entityLabel="questa NC"
        onSave={async (reason, type) => {
          const r = await genericUpdateAction(
            "non_conformity",
            nc.id,
            { title, description, severity, status },
            reason,
            type,
            [`/non-conformities/${nc.id}`, "/non-conformities"],
          );
          if (!r.error) setEditing(false);
          return r;
        }}
        onDelete={async (reason, action) =>
          genericDeleteAction("non_conformity", nc.id, reason, action, ["/non-conformities"])
        }
      />

      <div className="space-y-2 text-sm">
        <label className="block">
          <span className="block text-xs text-leo-muted">Titolo</span>
          {editing ? (
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          ) : (
            <span className="block font-medium">{title}</span>
          )}
        </label>
        <label className="block">
          <span className="block text-xs text-leo-muted">Descrizione</span>
          {editing ? (
            <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          ) : (
            <span className="block whitespace-pre-line">{description || "—"}</span>
          )}
        </label>
        <div className="flex flex-wrap gap-4">
          <label className="block">
            <span className="block text-xs text-leo-muted">Gravità</span>
            {editing ? (
              <select className="rounded-md border border-leo-border bg-leo-card px-2 py-1 text-sm" value={severity} onChange={(e) => setSeverity(e.target.value)}>
                {SEVERITY_OPTS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            ) : (
              <Badge variant={severity === "critica" ? "red" : severity === "maggiore" ? "orange" : "yellow"}>{severity}</Badge>
            )}
          </label>
          <label className="block">
            <span className="block text-xs text-leo-muted">Stato</span>
            {editing ? (
              <select className="rounded-md border border-leo-border bg-leo-card px-2 py-1 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
                {STATUS_OPTS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            ) : (
              <Badge variant="outline">{status.replace(/_/g, " ")}</Badge>
            )}
          </label>
        </div>
        <div className="rounded-md bg-leo-card/30 px-2 py-1.5 text-[10px] text-leo-muted">
          Firma applicativa automatica: chi salva diventa revisore della modifica. Campi firma non editabili.
        </div>
      </div>
    </div>
  );
}
