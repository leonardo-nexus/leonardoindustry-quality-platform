"use client";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { authorizeWeldAction, setWeldExecutedAction, acceptWeldAction } from "../../actions";

export function WeldStatusButtons({
  weldId,
  currentStatus,
}: {
  weldId: string;
  currentStatus: string;
}) {
  const [isPending, startTransition] = useTransition();

  function go(fn: () => Promise<{ error?: string } | { ok?: boolean }>) {
    startTransition(async () => {
      const r = await fn();
      if ("error" in r && r.error) toast.error(r.error);
      else toast.success("Stato aggiornato");
    });
  }

  return (
    <div className="flex gap-2">
      {currentStatus === "pianificata" && (
        <Button onClick={() => go(() => authorizeWeldAction(weldId))} disabled={isPending}>
          Autorizza
        </Button>
      )}
      {currentStatus === "autorizzata" && (
        <Button
          onClick={() => go(() => setWeldExecutedAction(weldId, new Date().toISOString().slice(0, 10)))}
          disabled={isPending}
        >
          Marca eseguita
        </Button>
      )}
      {["eseguita", "controllata"].includes(currentStatus) && (
        <Button onClick={() => go(() => acceptWeldAction(weldId))} disabled={isPending}>
          Accetta saldatura
        </Button>
      )}
    </div>
  );
}
