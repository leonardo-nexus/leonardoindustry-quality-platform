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
            const windows = r.windows ? Object.entries(r.windows).filter(([_, n]) => (n as number) > 0).map(([k, n]) => `${k}:${n}`).join(" · ") : "";
            toast.success(`Escalation: ${r.created} notifiche · ${r.escalated} a direzione${windows ? ` (${windows})` : ""}`);
            router.refresh();
          }
        })
      }
    >
      ⚡ Esegui escalation manuali
    </Button>
  );
}
