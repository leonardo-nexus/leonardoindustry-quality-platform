"use client";
import { useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { runQualityEscalationsAction } from "./actions";

export function RunEscalationsButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      variant="outline"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const r = await runQualityEscalationsAction();
          if (r?.error) toast.error(r.error);
          else {
            toast.success(`Escalation eseguite: ${r.created} notifiche generate · ${r.escalated} elementi escalati`);
            router.refresh();
          }
        })
      }
    >
      ⚡ Esegui escalation manuali
    </Button>
  );
}
