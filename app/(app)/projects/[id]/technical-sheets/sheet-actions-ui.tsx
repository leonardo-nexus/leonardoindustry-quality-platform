"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChangeReasonDialog } from "@/components/audit/change-reason-dialog";
import { createTechnicalSheetAction, approveTechnicalSheetAction } from "./actions";

export function ApproveSheetButton({ sheetId, projectId }: { sheetId: string; projectId: string }) {
  const router = useRouter();
  const [showReason, setShowReason] = useState(false);
  const [pending, startTransition] = useTransition();
  function handle(reason: string) {
    setShowReason(false);
    startTransition(async () => {
      const r = await approveTechnicalSheetAction(sheetId, projectId, reason);
      if (r?.error) toast.error(r.error);
      else { toast.success("Scheda tecnica approvata"); router.refresh(); }
    });
  }
  return (
    <>
      <Button size="sm" variant="outline" disabled={pending} onClick={() => setShowReason(true)} className="border-status-green/40 text-status-green hover:bg-status-green/10">
        {pending ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <CheckCircle2 className="mr-1 h-3 w-3" />}
        Approva scheda
      </Button>
      <ChangeReasonDialog open={showReason} onCancel={() => setShowReason(false)} onConfirm={handle} required title="Conferma approvazione scheda" />
    </>
  );
}

export function NewSheetForm({ projectId, companyId }: { projectId: string; companyId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  function submit(formData: FormData) {
    startTransition(async () => {
      const r = await createTechnicalSheetAction(projectId, companyId, formData);
      if (r?.error) toast.error(r.error);
      else { toast.success("Scheda creata"); router.refresh(); }
    });
  }
  return (
    <form action={submit} className="grid gap-2 sm:grid-cols-2">
      <Input name="code" placeholder="TS-..." required />
      <Input name="revision" placeholder="Rev. 00" defaultValue="00" />
      <Input name="title" placeholder="Titolo scheda" className="sm:col-span-2" required />
      <Input name="material_type" placeholder="Tipo materiale" />
      <Input name="supplier_name" placeholder="Fornitore" />
      <Button type="submit" size="sm" disabled={pending} className="sm:col-span-2">
        {pending ? "..." : <><Plus className="mr-1 h-3 w-3" /> Crea scheda</>}
      </Button>
    </form>
  );
}
