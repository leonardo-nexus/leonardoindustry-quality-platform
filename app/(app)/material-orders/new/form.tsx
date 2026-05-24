"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createMaterialOrderAction } from "../actions";

export function NewOrderForm({ companyId, projects, sourceRequest }: { companyId: string; projects: any[]; sourceRequest?: any }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  function submit(formData: FormData) {
    formData.set("company_id", companyId);
    if (sourceRequest) formData.set("material_request_id", sourceRequest.id);
    startTransition(async () => {
      const r = await createMaterialOrderAction(formData);
      if (r?.error) toast.error(r.error);
      else { toast.success("Ordine creato"); router.push(`/material-orders/${r.id}`); }
    });
  }
  return (
    <form action={submit} className="grid gap-3 sm:grid-cols-2">
      <label className="block">
        <span className="block text-xs text-leo-muted mb-1">Codice ordine *</span>
        <Input name="order_code" placeholder="MAT-ORD-..." required />
      </label>
      <label className="block">
        <span className="block text-xs text-leo-muted mb-1">Commessa</span>
        <select name="project_id" defaultValue={sourceRequest?.project?.id ?? ""} className="w-full rounded-md border border-leo-border bg-leo-card px-2 py-2 text-sm">
          <option value="">— nessuna —</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}
        </select>
      </label>
      <label className="block">
        <span className="block text-xs text-leo-muted mb-1">Fornitore *</span>
        <Input name="supplier_name" required />
      </label>
      <label className="block">
        <span className="block text-xs text-leo-muted mb-1">Email fornitore</span>
        <Input type="email" name="supplier_email" />
      </label>
      <label className="block">
        <span className="block text-xs text-leo-muted mb-1">Data consegna prevista</span>
        <Input type="date" name="expected_delivery" defaultValue={sourceRequest?.needed_by ?? ""} />
      </label>
      <label className="block">
        <span className="block text-xs text-leo-muted mb-1">Valore €</span>
        <Input type="number" step="0.01" name="total_value_euro" />
      </label>
      <label className="block">
        <span className="block text-xs text-leo-muted mb-1">Indirizzo consegna</span>
        <Input name="destination_address" />
      </label>
      <label className="block">
        <span className="block text-xs text-leo-muted mb-1">Paese</span>
        <Input name="destination_country" defaultValue={sourceRequest?.destination_country ?? ""} />
      </label>
      <label className="block sm:col-span-2">
        <span className="block text-xs text-leo-muted mb-1">Sito / cantiere</span>
        <Input name="destination_site" defaultValue={sourceRequest?.destination_site ?? ""} />
      </label>
      {sourceRequest && (
        <div className="sm:col-span-2 rounded-md border border-status-orange/30 bg-status-orange/5 p-2 text-xs">
          ⚠ Verifica destinazione: la richiesta indicava {sourceRequest.destination_country ?? "—"}{sourceRequest.destination_site ? ` / ${sourceRequest.destination_site}` : ""}
        </div>
      )}
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Plus className="mr-1 h-3 w-3" />} Crea ordine
        </Button>
      </div>
    </form>
  );
}
