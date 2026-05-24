"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChangeReasonDialog } from "@/components/audit/change-reason-dialog";
import { createMaterialLotAction, verifyMaterialAction, recheckMaterialAction } from "./actions";

export function VerifyMaterialButton({ lotId, projectId, disabled }: { lotId: string; projectId: string; disabled: boolean }) {
  const router = useRouter();
  const [showReason, setShowReason] = useState(false);
  const [pending, startTransition] = useTransition();
  function handle(reason: string) {
    setShowReason(false);
    startTransition(async () => {
      const r = await verifyMaterialAction(lotId, projectId, reason);
      if (r?.error) toast.error(r.error);
      else { toast.success("Lotto verificato e sbloccato"); router.refresh(); }
    });
  }
  return (
    <>
      <Button size="sm" variant="outline" disabled={pending || disabled} onClick={() => setShowReason(true)} className="border-status-green/40 text-status-green hover:bg-status-green/10 disabled:opacity-50">
        {pending ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <CheckCircle2 className="mr-1 h-3 w-3" />}
        Marca verificato
      </Button>
      <ChangeReasonDialog open={showReason} onCancel={() => setShowReason(false)} onConfirm={handle} required title="Verifica lotto materiale" />
    </>
  );
}

export function RecheckButton({ lotId, projectId }: { lotId: string; projectId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  function handle() {
    startTransition(async () => {
      const r = await recheckMaterialAction(lotId, projectId);
      if (r?.error) toast.error(r.error);
      else { toast.success("Stato lotto ricontrollato"); router.refresh(); }
    });
  }
  return (
    <Button size="sm" variant="ghost" disabled={pending} onClick={handle}>
      {pending ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <RefreshCw className="mr-1 h-3 w-3" />}
      Ricontrolla
    </Button>
  );
}

export function NewMaterialLotForm({ projectId, companyId, sheets }: { projectId: string; companyId: string; sheets: any[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  function submit(formData: FormData) {
    startTransition(async () => {
      const r = await createMaterialLotAction(projectId, companyId, formData);
      if (r?.error) toast.error(r.error);
      else { toast.success("Lotto creato (verifica blocchi)"); router.refresh(); }
    });
  }
  return (
    <form action={submit} className="grid gap-2 sm:grid-cols-2">
      <Input name="lot_code" placeholder="LOT-... codice lotto" required />
      <Input name="heat_number" placeholder="Colata/heat" />
      <Input name="material_description" placeholder="Descrizione materiale" className="sm:col-span-2" />
      <Input name="material_grade" placeholder="Grade (S355, Al, ...)" />
      <select name="technical_sheet_id" className="rounded-md border border-leo-border bg-leo-card px-2 py-1.5 text-sm">
        <option value="">— scheda tecnica —</option>
        {sheets.map((s) => <option key={s.id} value={s.id}>{s.code} · {s.title} {s.status !== "approvata" && "(non approvata)"}</option>)}
      </select>
      <Input name="quantity" type="number" step="0.001" placeholder="Quantità" />
      <Input name="unit" placeholder="Unità (m, kg, n°)" />
      <Input name="supplier_name" placeholder="Fornitore" className="sm:col-span-2" />
      <Button type="submit" size="sm" disabled={pending} className="sm:col-span-2">
        {pending ? "Creazione..." : <><Plus className="mr-1 h-3 w-3" /> Registra lotto</>}
      </Button>
    </form>
  );
}
