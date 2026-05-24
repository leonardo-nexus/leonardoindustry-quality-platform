"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ChangeReasonDialog } from "@/components/audit/change-reason-dialog";
import { verifyContractAction, setClauseStatusAction, createContractAction, createClauseAction } from "./actions";

const CLAUSE_STATUS = ["da_chiarire", "accettata", "non_accettata", "chiarita"];

export function VerifyContractButton({ contractId, projectId }: { contractId: string; projectId: string }) {
  const router = useRouter();
  const [showReason, setShowReason] = useState(false);
  const [pending, startTransition] = useTransition();

  function handle(reason: string) {
    setShowReason(false);
    startTransition(async () => {
      const r = await verifyContractAction(contractId, projectId, reason);
      if (r?.error) toast.error(r.error);
      else { toast.success("Contratto marcato come verificato"); router.refresh(); }
    });
  }

  return (
    <>
      <Button size="sm" variant="outline" disabled={pending} onClick={() => setShowReason(true)} className="border-status-green/40 text-status-green hover:bg-status-green/10">
        {pending ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <CheckCircle2 className="mr-1 h-3 w-3" />}
        Marca come verificato
      </Button>
      <ChangeReasonDialog open={showReason} onCancel={() => setShowReason(false)} onConfirm={handle} required title="Conferma verifica contratto" />
    </>
  );
}

export function ClauseStatusSelect({ clauseId, projectId, current }: { clauseId: string; projectId: string; current: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  function change(newStatus: string) {
    if (newStatus === current) return;
    startTransition(async () => {
      const r = await setClauseStatusAction(clauseId, projectId, newStatus);
      if (r?.error) toast.error(r.error);
      else { toast.success(`Clausola: ${newStatus}`); router.refresh(); }
    });
  }
  return (
    <select
      className="rounded-md border border-leo-border bg-leo-card px-2 py-1 text-xs"
      value={current}
      disabled={pending}
      onChange={(e) => change(e.target.value)}
    >
      {CLAUSE_STATUS.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
    </select>
  );
}

export function NewContractForm({ projectId, companyId }: { projectId: string; companyId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  function submit(formData: FormData) {
    startTransition(async () => {
      const r = await createContractAction(projectId, companyId, formData);
      if (r?.error) toast.error(r.error);
      else { toast.success("Contratto creato"); router.refresh(); }
    });
  }
  return (
    <form action={submit} className="grid gap-2 sm:grid-cols-2">
      <Input name="code" placeholder="CTR-... codice" required />
      <Input name="client_name" placeholder="Cliente" />
      <Input name="title" placeholder="Titolo contratto" className="sm:col-span-2" required />
      <Input name="value_euro" type="number" placeholder="Valore €" />
      <Textarea name="penalty_clauses" placeholder="Note penali contrattuali" className="sm:col-span-2" rows={2} />
      <Button type="submit" size="sm" disabled={pending} className="sm:col-span-2">
        {pending ? "Creazione..." : "Crea contratto"}
      </Button>
    </form>
  );
}

export function NewClauseForm({ contractId, projectId, companyId }: { contractId: string; projectId: string; companyId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  function submit(formData: FormData) {
    startTransition(async () => {
      const r = await createClauseAction(contractId, projectId, companyId, formData);
      if (r?.error) toast.error(r.error);
      else { toast.success("Clausola critica registrata"); router.refresh(); }
    });
  }
  return (
    <form action={submit} className="grid gap-2 sm:grid-cols-2">
      <Input name="clause_code" placeholder="CL-..." />
      <Input name="clause_title" placeholder="Titolo clausola" required />
      <Textarea name="clause_text" placeholder="Testo clausola" className="sm:col-span-2" rows={2} />
      <select name="risk_type" className="rounded-md border border-leo-border bg-leo-card px-2 py-1.5 text-sm">
        {["penale","scadenza","tecnica","documentale","contestazione","sicurezza","ambientale","altro"].map((r) => <option key={r} value={r}>{r}</option>)}
      </select>
      <select name="severity" className="rounded-md border border-leo-border bg-leo-card px-2 py-1.5 text-sm" defaultValue="attenzione">
        {["info","attenzione","urgente","critico","blocco"].map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
      <Textarea name="obligation" placeholder="Obbligo derivante" className="sm:col-span-2" rows={2} />
      <Button type="submit" size="sm" disabled={pending} className="sm:col-span-2">
        {pending ? "Registrazione..." : "Aggiungi clausola"}
      </Button>
    </form>
  );
}
