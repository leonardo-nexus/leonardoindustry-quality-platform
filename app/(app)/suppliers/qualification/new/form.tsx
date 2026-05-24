"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createQualificationAction } from "../actions";

export function NewQualForm({ companies, defaultCompanyId, erpId }: { companies: any[]; defaultCompanyId: string; erpId?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  function submit(formData: FormData) {
    startTransition(async () => {
      const r = await createQualificationAction(formData);
      if (r?.error) toast.error(r.error);
      else {
        toast.success("Qualifica creata · global_id generato · evento sync_outbox emesso");
        router.push(`/suppliers/qualification/${r.id}`);
      }
    });
  }
  return (
    <form action={submit} className="grid gap-3 sm:grid-cols-2">
      <label className="block sm:col-span-2">
        <span className="block text-xs text-leo-muted mb-1">Nome fornitore (alias breve) *</span>
        <Input name="supplier_name" required />
      </label>
      <label className="block sm:col-span-2">
        <span className="block text-xs text-leo-muted mb-1">Ragione sociale completa *</span>
        <Input name="legal_name" required />
      </label>
      <label className="block">
        <span className="block text-xs text-leo-muted mb-1">P.IVA / Tax ID</span>
        <Input name="tax_id" />
      </label>
      <label className="block">
        <span className="block text-xs text-leo-muted mb-1">Paese</span>
        <Input name="country" placeholder="Italia / Spagna" />
      </label>
      <label className="block">
        <span className="block text-xs text-leo-muted mb-1">Tipo fornitore</span>
        <select name="supplier_type" defaultValue="materiale" className="w-full rounded-md border border-leo-border bg-leo-card px-2 py-2 text-sm">
          <option value="materiale">Materiale</option>
          <option value="servizio">Servizio</option>
          <option value="subappalto">Subappalto</option>
          <option value="consulenza">Consulenza</option>
          <option value="trasporto">Trasporto</option>
          <option value="altro">Altro</option>
        </select>
      </label>
      <label className="block">
        <span className="block text-xs text-leo-muted mb-1">Impresa *</span>
        <select name="company_id" defaultValue={defaultCompanyId} required className="w-full rounded-md border border-leo-border bg-leo-card px-2 py-2 text-sm">
          {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </label>
      <label className="block sm:col-span-2">
        <span className="block text-xs text-leo-muted mb-1">Codice ERP (se esistente)</span>
        <Input name="erp_supplier_id" defaultValue={erpId} placeholder="es. SUP-12345" />
      </label>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending} className="mobile-action">
          {pending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Plus className="mr-1 h-4 w-4" />}
          Crea qualifica
        </Button>
        <p className="mt-2 text-xs text-leo-muted">
          ⓘ Genera global_id automatico · integration_mapping ERP/Quality · evento sync_outbox per push ERP · stato iniziale pending bloccato fino al completamento dati
        </p>
      </div>
    </form>
  );
}
