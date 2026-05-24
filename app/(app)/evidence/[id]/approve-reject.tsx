"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { approveEvidenceAction, rejectEvidenceAction } from "../actions";

export function ApproveReject({ evidenceId }: { evidenceId: string }) {
  const router = useRouter();
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();

  function approve() {
    startTransition(async () => {
      const r = await approveEvidenceAction(evidenceId);
      if (r?.error) toast.error(r.error);
      else { toast.success("Evidenza verificata"); router.refresh(); }
    });
  }

  function reject() {
    if (reason.trim().length < 3) return toast.error("Motivo obbligatorio");
    startTransition(async () => {
      const r = await rejectEvidenceAction(evidenceId, reason);
      if (r?.error) toast.error(r.error);
      else { toast.success("Evidenza respinta"); router.refresh(); }
    });
  }

  if (showReject) {
    return (
      <div className="space-y-2">
        <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="Motivo respingimento" />
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={() => setShowReject(false)}>Annulla</Button>
          <Button size="sm" variant="destructive" disabled={pending} onClick={reject}>Conferma respingi</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Button onClick={approve} disabled={pending} className="mobile-action border-status-green/40 text-status-green hover:bg-status-green/10" variant="outline">
        {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />} Approva
      </Button>
      <Button onClick={() => setShowReject(true)} disabled={pending} variant="outline" className="mobile-action border-status-red/40 text-status-red">
        <XCircle className="mr-2 h-4 w-4" /> Respingi con motivo
      </Button>
    </div>
  );
}
