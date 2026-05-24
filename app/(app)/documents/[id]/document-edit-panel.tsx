"use client";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EditToolbar } from "@/components/audit/edit-toolbar";
import { genericUpdateAction, genericDeleteAction } from "@/lib/audit/generic-actions";

export function DocumentEditPanel({ doc }: { doc: any }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(doc.title ?? "");
  const [scope, setScope] = useState(doc.scope ?? "");
  const [status, setStatus] = useState(doc.status ?? "attivo");
  const [reviewMonths, setReviewMonths] = useState(doc.review_frequency_months ?? 12);

  function reset() {
    setTitle(doc.title ?? "");
    setScope(doc.scope ?? "");
    setStatus(doc.status ?? "attivo");
    setReviewMonths(doc.review_frequency_months ?? 12);
    setEditing(false);
  }

  return (
    <div className="space-y-3">
      <EditToolbar
        isEditing={editing}
        reasonRequired
        entityLabel="questo documento"
        canDelete={false}
        canArchive
        onEdit={() => setEditing(true)}
        onCancel={reset}
        onSave={async (reason, type) => {
          const r = await genericUpdateAction(
            "document",
            doc.id,
            { title, scope, status, review_frequency_months: Number(reviewMonths) },
            reason,
            type,
            [`/documents/${doc.id}`, "/documents"],
          );
          if (!r.error) setEditing(false);
          return r;
        }}
        onDelete={async (reason, action) =>
          genericDeleteAction("document", doc.id, reason, action, ["/documents"])
        }
      />

      <div className="space-y-2 text-sm">
        <label className="block">
          <span className="block text-xs text-leo-muted">Titolo</span>
          {editing ? <Input value={title} onChange={(e) => setTitle(e.target.value)} /> : <span className="block">{title}</span>}
        </label>
        <label className="block">
          <span className="block text-xs text-leo-muted">Scope / ambito</span>
          {editing ? <Textarea rows={2} value={scope} onChange={(e) => setScope(e.target.value)} /> : <span className="block whitespace-pre-line">{scope || "—"}</span>}
        </label>
        <div className="flex gap-4">
          <label className="block">
            <span className="block text-xs text-leo-muted">Stato</span>
            {editing ? (
              <select className="rounded-md border border-leo-border bg-leo-card px-2 py-1 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="bozza">bozza</option>
                <option value="attivo">attivo</option>
                <option value="obsoleto">obsoleto</option>
              </select>
            ) : <span>{status}</span>}
          </label>
          <label className="block">
            <span className="block text-xs text-leo-muted">Frequenza revisione (mesi)</span>
            {editing ? (
              <Input type="number" min={1} max={120} value={reviewMonths} onChange={(e) => setReviewMonths(Number(e.target.value))} className="w-24" />
            ) : <span>{reviewMonths ?? "—"}</span>}
          </label>
        </div>
      </div>
    </div>
  );
}
