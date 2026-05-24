"use client";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { EditToolbar } from "@/components/audit/edit-toolbar";
import { genericUpdateAction, genericDeleteAction } from "@/lib/audit/generic-actions";

export function OrderEditPanel({ order }: { order: any }) {
  const [editing, setEditing] = useState(false);
  const [supplier, setSupplier] = useState(order.supplier_name ?? "");
  const [email, setEmail] = useState(order.supplier_email ?? "");
  const [expDel, setExpDel] = useState(order.expected_delivery ?? "");
  const [dest, setDest] = useState(order.destination_country ?? "");
  const [destSite, setDestSite] = useState(order.destination_site ?? "");
  const [val, setVal] = useState(String(order.total_value_euro ?? ""));

  function reset() {
    setSupplier(order.supplier_name ?? "");
    setEmail(order.supplier_email ?? "");
    setExpDel(order.expected_delivery ?? "");
    setDest(order.destination_country ?? "");
    setDestSite(order.destination_site ?? "");
    setVal(String(order.total_value_euro ?? ""));
    setEditing(false);
  }

  return (
    <div className="space-y-3">
      <EditToolbar
        isEditing={editing}
        reasonRequired
        entityLabel="questo ordine"
        canDelete={false}
        canArchive
        onEdit={() => setEditing(true)}
        onCancel={reset}
        onSave={async (reason, type) => {
          const r = await genericUpdateAction(
            "material_order",
            order.id,
            {
              supplier_name: supplier, supplier_email: email,
              expected_delivery: expDel || null,
              destination_country: dest, destination_site: destSite,
              total_value_euro: Number(val) || null,
            },
            reason, type,
            [`/material-orders/${order.id}`, "/material-orders"],
          );
          if (!r.error) setEditing(false);
          return r;
        }}
        onDelete={async (reason, action) => genericDeleteAction("material_order", order.id, reason, action, ["/material-orders"])}
      />
      <div className="grid gap-2 sm:grid-cols-2 text-sm">
        <label className="block">
          <span className="block text-xs text-leo-muted">Fornitore</span>
          {editing ? <Input value={supplier} onChange={(e) => setSupplier(e.target.value)} /> : <span>{supplier}</span>}
        </label>
        <label className="block">
          <span className="block text-xs text-leo-muted">Email</span>
          {editing ? <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /> : <span>{email || "—"}</span>}
        </label>
        <label className="block">
          <span className="block text-xs text-leo-muted">Data consegna prevista</span>
          {editing ? <Input type="date" value={expDel} onChange={(e) => setExpDel(e.target.value)} /> : <span>{expDel || "—"}</span>}
        </label>
        <label className="block">
          <span className="block text-xs text-leo-muted">Valore €</span>
          {editing ? <Input type="number" step="0.01" value={val} onChange={(e) => setVal(e.target.value)} /> : <span>{val || "—"}</span>}
        </label>
        <label className="block">
          <span className="block text-xs text-leo-muted">Paese</span>
          {editing ? <Input value={dest} onChange={(e) => setDest(e.target.value)} /> : <span>{dest || "—"}</span>}
        </label>
        <label className="block">
          <span className="block text-xs text-leo-muted">Sito</span>
          {editing ? <Input value={destSite} onChange={(e) => setDestSite(e.target.value)} /> : <span>{destSite || "—"}</span>}
        </label>
      </div>
    </div>
  );
}
