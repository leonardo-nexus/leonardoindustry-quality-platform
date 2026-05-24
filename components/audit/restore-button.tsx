"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RotateCcw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChangeReasonDialog } from "./change-reason-dialog";
import { genericRestoreAction } from "@/lib/audit/generic-actions";

/**
 * Bottone "Ripristina" per record soft-deleted. Apre dialog motivo + chiama server action.
 * Il record viene riportato attivo ma con status "sicuro" (bozza/fuori_servizio).
 */
export function RestoreButton({ entityType, entityId, revalidateUrls = [] }: {
  entityType: string;
  entityId: string;
  revalidateUrls?: string[];
}) {
  const router = useRouter();
  const [showReason, setShowReason] = useState(false);
  const [pending, startTransition] = useTransition();

  function handle(reason: string) {
    setShowReason(false);
    startTransition(async () => {
      const r = await genericRestoreAction(entityType, entityId, reason, revalidateUrls);
      if (r?.error) toast.error(r.error);
      else {
        toast.success(`Record ripristinato${r.restoredStatus ? ` come ${r.restoredStatus}` : ""}`);
        router.refresh();
      }
    });
  }

  return (
    <>
      <Button size="sm" variant="outline" disabled={pending} onClick={() => setShowReason(true)} className="border-status-green/40 text-status-green hover:bg-status-green/10">
        {pending ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <RotateCcw className="mr-1 h-3 w-3" />}
        Ripristina
      </Button>
      <ChangeReasonDialog
        open={showReason}
        onCancel={() => setShowReason(false)}
        onConfirm={handle}
        required
        title="Ripristina record archiviato"
      />
    </>
  );
}
