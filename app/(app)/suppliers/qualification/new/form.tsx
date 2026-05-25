"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createQualificationAction } from "../actions";

type CompanyOption = {
  id: string;
  name: string;
};

export function NewQualForm({ companies, defaultCompanyId, erpId }: { companies: CompanyOption[]; defaultCompanyId: string; erpId?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  function submit(formData: FormData) {
    startTransition(async () => {
      const r = await createQualificationAction(formData);
      if (r?.error) toast.error(r.error);
      else {
        toast.success("Fornitore creato - anagrafica caricata - checklist documentale pronta");
        router.push(`/suppliers/qualification/${r.id}`);
      }
    });
  }
  return (
    <form action={submit} className="grid gap-4">
      <section className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <h2 className="text-sm font-semibold uppercase text-leo-muted">Anagrafica fornitore</h2>
        </div>
        <Field name="supplier_name" label="Nome fornitore / alias breve" required />
        <Field name="legal_name" label="Ragione sociale completa" required />
        <Field name="tax_id" label="P.IVA / Tax ID" />
        <Field name="country" label="Paese" placeholder="Italia / Spagna" />
        <Field name="email" label="Email generale" type="email" />
        <Field name="phone" label="Telefono generale" />
        <Field name="pec" label="PEC" type="email" />
        <Field name="codice_sdi" label="Codice SDI" />
        <label className="block">
          <span className="mb-1 block text-xs text-leo-muted">Tipo fornitore</span>
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
          <span className="mb-1 block text-xs text-leo-muted">Impresa *</span>
          <select name="company_id" defaultValue={defaultCompanyId} required className="w-full rounded-md border border-leo-border bg-leo-card px-2 py-2 text-sm">
            {companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
          </select>
        </label>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <h2 className="text-sm font-semibold uppercase text-leo-muted">Sede e contatti</h2>
        </div>
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs text-leo-muted">Indirizzo sede legale</span>
          <Input name="address" />
        </label>
        <Field name="city" label="Citta" />
        <Field name="province" label="Provincia / Stato" />
        <Field name="postal_code" label="CAP / ZIP" />
        <Field name="website" label="Sito web" placeholder="https://..." />
        <Field name="contact_name" label="Referente principale" />
        <Field name="contact_role" label="Ruolo referente" />
        <Field name="contact_email" label="Email referente" type="email" />
        <Field name="contact_phone" label="Telefono referente" />
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs text-leo-muted">Codice ERP (se esistente)</span>
          <Input name="erp_supplier_id" defaultValue={erpId} placeholder="es. SUP-12345" />
        </label>
      </section>

      <div>
        <Button type="submit" disabled={pending} className="mobile-action">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Crea fornitore
        </Button>
        <p className="mt-2 text-xs text-leo-muted">
          Genera global_id, mapping ERP/Quality, checklist documentale e stato iniziale pending fino al completamento della valutazione.
        </p>
      </div>
    </form>
  );
}

function Field({
  name,
  label,
  type = "text",
  placeholder,
  required = false,
}: {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-leo-muted">{label}{required && " *"}</span>
      <Input name={name} type={type} placeholder={placeholder} required={required} />
    </label>
  );
}
