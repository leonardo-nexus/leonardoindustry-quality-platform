"use client";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { updateNcStatusAction } from "../actions";

export function NcCloseButton({ ncId, currentStatus }: { ncId: string; currentStatus: string }) {
  const [isPending, startTransition] = useTransition();
  if (currentStatus === "chiusa") return null;
  function handleClose() {
    startTransition(async () => {
      const r = await updateNcStatusAction(ncId, "chiusa");
      if (r?.error) toast.error(r.error);
      else toast.success("NC chiusa");
    });
  }
  return (
    <Button variant="default" disabled={isPending} onClick={handleClose}>
      {isPending ? "Chiusura..." : "Chiudi NC"}
    </Button>
  );
}
