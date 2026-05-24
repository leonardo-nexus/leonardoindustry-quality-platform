"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { createInterventionAction } from "../actions";

const TYPES = [
  "manutenzione_ordinaria","manutenzione_straordinaria","riparazione","taratura",
  "verifica_periodica","controllo_funzionale","pulizia","sostituzione_consumabili",
  "sostituzione_ricambi","ispezione","collaudo","fermo_tecnico","rientro_in_servizio",
  "intervento_garanzia","intervento_urgente",
];

export function NewInterventionForm({ assetId, currentStatus, people }: { assetId: string; currentStatus: string; people: any[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  function submit(formData: FormData) {
    startTransition(async () => {
      const r = await createInterventionAction(assetId, formData);
      if (r?.error) toast.error(r.error);
      else { toast.success(`Intervento ${r.code} registrato`); router.push(`/assets/${assetId}/interventions/${r.id}`); }
    });
  }
  return (
    <form action={submit} className="space-y-6">
      {/* Classificazione */}
      <Section title="Classificazione">
        <Grid>
          <Field label="Tipo intervento *">
            <select name="intervention_type" required className="w-full rounded-md border border-leo-border bg-leo-card px-2 py-2 text-sm">
              {TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
            </select>
          </Field>
          <Field label="Categoria *">
            <select name="category" defaultValue="ordinario" className="w-full rounded-md border border-leo-border bg-leo-card px-2 py-2 text-sm">
              <option value="ordinario">Ordinario</option>
              <option value="straordinario">Straordinario</option>
              <option value="urgente">Urgente</option>
              <option value="garanzia">Garanzia</option>
            </select>
          </Field>
          <Field label="Origine">
            <select name="origin" defaultValue="programmato" className="w-full rounded-md border border-leo-border bg-leo-card px-2 py-2 text-sm">
              <option value="programmato">Programmato</option>
              <option value="guasto">Guasto</option>
              <option value="NC">NC</option>
              <option value="audit">Audit</option>
              <option value="segnalazione_operatore">Segnalazione operatore</option>
              <option value="scadenza">Scadenza</option>
              <option value="altro">Altro</option>
            </select>
          </Field>
        </Grid>
      </Section>

      {/* Esecutore */}
      <Section title="Esecutore">
        <Grid>
          <Field label="Azienda esterna (se applicabile)">
            <Input name="external_company" />
          </Field>
          <Field label="Tecnico intervenuto">
            <Input name="technician_name" />
          </Field>
          <Field label="Numero fattura/preventivo">
            <Input name="invoice_number" />
          </Field>
        </Grid>
      </Section>

      {/* Descrizione tecnica */}
      <Section title="Descrizione tecnica">
        <Field label="Problema riscontrato"><Textarea name="issue_found" rows={2} /></Field>
        <Field label="Diagnosi"><Textarea name="diagnosis" rows={2} /></Field>
        <Field label="Lavoro eseguito *"><Textarea name="work_performed" rows={3} required /></Field>
        <Grid>
          <Field label="Esito test funzionale">
            <select name="functional_test_result" className="w-full rounded-md border border-leo-border bg-leo-card px-2 py-2 text-sm">
              <option value="">— non eseguito —</option>
              <option value="conforme">Conforme</option>
              <option value="non_conforme">NON CONFORME (genera NC)</option>
              <option value="limitato">Limitato</option>
            </select>
          </Field>
          <Field label="Asset utilizzabile dopo intervento">
            <select name="asset_usable" defaultValue="1" className="w-full rounded-md border border-leo-border bg-leo-card px-2 py-2 text-sm">
              <option value="1">Sì</option>
              <option value="0">NO (genera blocco operativo)</option>
            </select>
          </Field>
          <Field label="Stato asset dopo">
            <Input name="status_after" defaultValue={currentStatus} />
          </Field>
        </Grid>
      </Section>

      {/* Costi */}
      <Section title="Costi">
        <Grid>
          <Field label="Costo manodopera €"><Input type="number" step="0.01" name="labor_cost" /></Field>
          <Field label="Ore manodopera"><Input type="number" step="0.25" name="labor_hours" /></Field>
          <Field label="Costo ricambi €"><Input type="number" step="0.01" name="parts_cost" /></Field>
          <Field label="Costo trasferta €"><Input type="number" step="0.01" name="travel_cost" /></Field>
          <Field label="Fornitore"><Input name="supplier_name" /></Field>
        </Grid>
      </Section>

      {/* Garanzia */}
      <Section title="Garanzia">
        <Grid>
          <Field label="Intervento in garanzia">
            <select name="in_warranty" defaultValue="0" className="w-full rounded-md border border-leo-border bg-leo-card px-2 py-2 text-sm">
              <option value="0">No</option>
              <option value="1">Sì</option>
            </select>
          </Field>
          <Field label="Garanzia fino al"><Input type="date" name="warranty_until" /></Field>
          <Field label="Riferimento garanzia"><Input name="warranty_reference" /></Field>
        </Grid>
      </Section>

      {/* Prossima scadenza */}
      <Section title="Prossima scadenza (genera task + calendario + reminder)">
        <Grid>
          <Field label="Prossima data scadenza"><Input type="date" name="next_due_date" /></Field>
          <Field label="Tipo scadenza"><Input name="next_due_type" placeholder="es. tagliando, taratura, manutenzione" /></Field>
          <Field label="Responsabile prossima scadenza">
            <select name="next_due_responsible_id" className="w-full rounded-md border border-leo-border bg-leo-card px-2 py-2 text-sm">
              <option value="">— me stesso —</option>
              {people.map((p) => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}
            </select>
          </Field>
          <Field label="Frequenza giorni (es. 365)"><Input type="number" name="next_due_frequency_days" /></Field>
        </Grid>
      </Section>

      <Field label="Note generali"><Textarea name="notes" rows={2} /></Field>

      <Button type="submit" size="lg" disabled={pending} className="mobile-action w-full sm:w-auto">
        {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
        Registra intervento + firma
      </Button>
      <p className="text-xs text-leo-muted">
        ⓘ Firma automatica con l'utente loggato (audit log). Se asset non utilizzabile → blocco operativo.
        Se test non conforme → NC. Se prossima scadenza → task + calendario + reminder T-30/T-7/T-1.
      </p>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-leo-border p-4">
      <h3 className="mb-3 text-xs font-semibold uppercase text-leo-muted">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}
function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-leo-muted">{label}</span>
      {children}
    </label>
  );
}
