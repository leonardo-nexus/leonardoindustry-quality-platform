"use client";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EditToolbar } from "@/components/audit/edit-toolbar";
import { genericUpdateAction, genericDeleteAction } from "@/lib/audit/generic-actions";

export function RequestEditPanel({ request }: { request: any }) {
  const [editing, setEditing] = useState(false);
  const [material, setMaterial] = useState(request.material_description ?? "");
  const [qty, setQty] = useState(String(request.quantity ?? ""));
  const [destCountry, setDestCountry] = useState(request.destination_country ?? "");
  const [destSite, setDestSite] = useState(request.destination_site ?? "");
  const [notes, setNotes] = useState(request.notes ?? "");

  function reset() {
    setMaterial(request.material_description ?? "");
    setQty(String(request.quantity ?? ""));
    setDestCountry(request.destination_country ?? "");
    setDestSite(request.destination_site ?? "");
    setNotes(request.notes ?? "");
    setEditing(false);
  }

  return (
    <div className="space-y-3">
      <EditToolbar
        isEditing={editing}
        reasonRequired
        entityLabel="questa richiesta"
        canDelete={false}
        canArchive
        onEdit={() => setEditing(true)}
        onCancel={reset}
        onSave={async (reason, type) => {
          const r = await genericUpdateAction(
            "material_request",
            request.id,
            { material_description: material, quantity: Number(qty) || null, destination_country: destCountry, destination_site: destSite, notes },
            reason, type,
            [`/material-requests/${request.id}`, "/material-requests"],
          );
          if (!r.error) setEditing(false);
          return r;
        }}
        onDelete={async (reason, action) => genericDeleteAction("material_request", request.id, reason, action, ["/material-requests"])}
      />
      <div className="space-y-2 text-sm">
        <label className="block">
          <span className="block text-xs text-leo-muted">Materiale</span>
          {editing ? <Textarea rows={2} value={material} onChange={(e) => setMaterial(e.target.value)} /> : <span>{material}</span>}
        </label>
        <div className="flex gap-2">
          <label className="block flex-1">
            <span className="block text-xs text-leo-muted">Quantità</span>
            {editing ? <Input type="number" value={qty} onChange={(e) => setQty(e.target.value)} /> : <span>{qty}</span>}
          </label>
          <label className="block flex-1">
            <span className="block text-xs text-leo-muted">Paese</span>
            {editing ? <Input value={destCountry} onChange={(e) => setDestCountry(e.target.value)} /> : <span>{destCountry || "—"}</span>}
          </label>
          <label className="block flex-1">
            <span className="block text-xs text-leo-muted">Sito</span>
            {editing ? <Input value={destSite} onChange={(e) => setDestSite(e.target.value)} /> : <span>{destSite || "—"}</span>}
          </label>
        </div>
        <label className="block">
          <span className="block text-xs text-leo-muted">Note</span>
          {editing ? <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /> : <span className="whitespace-pre-line">{notes || "—"}</span>}
        </label>
      </div>
    </div>
  );
}
