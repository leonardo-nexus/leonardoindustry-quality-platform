"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { createMaterialRequestAction } from "../actions";

export function NewMaterialRequestForm({ companyId, projects, sheets }: { companyId: string; projects: any[]; sheets: any[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  function submit(formData: FormData) {
    formData.set("company_id", companyId);
    startTransition(async () => {
      const r = await createMaterialRequestAction(formData);
      if (r?.error) toast.error(r.error);
      else { toast.success("Richiesta creata"); router.push(`/material-requests/${r.id}`); }
    });
  }
  return (
    <form action={submit} className="grid gap-3 sm:grid-cols-2">
      <label className="block sm:col-span-1">
        <span className="block text-xs text-leo-muted mb-1">Codice richiesta *</span>
        <Input name="request_code" placeholder="MAT-REQ-..." required />
      </label>
      <label className="block sm:col-span-1">
        <span className="block text-xs text-leo-muted mb-1">Commessa</span>
        <select name="project_id" className="w-full rounded-md border border-leo-border bg-leo-card px-2 py-2 text-sm">
          <option value="">— nessuna —</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}
        </select>
      </label>
      <label className="block sm:col-span-2">
        <span className="block text-xs text-leo-muted mb-1">Materiale *</span>
        <Textarea name="material_description" rows={2} required />
      </label>
      <label className="block">
        <span className="block text-xs text-leo-muted mb-1">Quantità</span>
        <Input name="quantity" type="number" step="0.001" />
      </label>
      <label className="block">
        <span className="block text-xs text-leo-muted mb-1">Unità</span>
        <Input name="unit" placeholder="pz, m, kg" />
      </label>
      <label className="block">
        <span className="block text-xs text-leo-muted mb-1">Necessario entro</span>
        <Input name="needed_by" type="date" />
      </label>
      <label className="block">
        <span className="block text-xs text-leo-muted mb-1">Scheda tecnica</span>
        <select name="technical_sheet_id" className="w-full rounded-md border border-leo-border bg-leo-card px-2 py-2 text-sm">
          <option value="">— nessuna —</option>
          {sheets.map((s) => <option key={s.id} value={s.id}>{s.code} · {s.title}{s.status !== "approvata" ? " (non approvata)" : ""}</option>)}
        </select>
      </label>
      <label className="block">
        <span className="block text-xs text-leo-muted mb-1">Paese destinazione</span>
        <Input name="destination_country" placeholder="Italia / Spagna" />
      </label>
      <label className="block">
        <span className="block text-xs text-leo-muted mb-1">Sito / cantiere</span>
        <Input name="destination_site" />
      </label>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
          {pending ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Plus className="mr-1 h-3 w-3" />} Crea richiesta
        </Button>
      </div>
    </form>
  );
}
