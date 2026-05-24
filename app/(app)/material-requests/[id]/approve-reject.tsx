"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChangeReasonDialog } from "@/components/audit/change-reason-dialog";
import { approveRequestAction, rejectRequestAction } from "../actions";

export function ApproveRejectButtons({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [showAppr, setShowAppr] = useState(false);
  const [showRej, setShowRej] = useState(false);
  const [pending, startTransition] = useTransition();

  function approve(reason: string) {
    setShowAppr(false);
    startTransition(async () => {
      const r = await approveRequestAction(requestId, reason);
      if (r?.error) toast.error(r.error); else { toast.success("Approvata"); router.refresh(); }
    });
  }
  function reject(reason: string) {
    setShowRej(false);
    startTransition(async () => {
      const r = await rejectRequestAction(requestId, reason);
      if (r?.error) toast.error(r.error); else { toast.success("Respinta"); router.refresh(); }
    });
  }
  return (
    <>
      <Button size="sm" disabled={pending} onClick={() => setShowAppr(true)} className="border-status-green/40 text-status-green hover:bg-status-green/10" variant="outline">
        <CheckCircle2 className="mr-1 h-3 w-3" /> Approva
      </Button>
      <Button size="sm" disabled={pending} onClick={() => setShowRej(true)} variant="outline" className="border-status-red/40 text-status-red hover:bg-status-red/10">
        <XCircle className="mr-1 h-3 w-3" /> Respingi
      </Button>
      <ChangeReasonDialog open={showAppr} onCancel={() => setShowAppr(false)} onConfirm={approve} title="Approva richiesta" required />
      <ChangeReasonDialog open={showRej} onCancel={() => setShowRej(false)} onConfirm={reject} title="Respingi richiesta" required />
    </>
  );
}
