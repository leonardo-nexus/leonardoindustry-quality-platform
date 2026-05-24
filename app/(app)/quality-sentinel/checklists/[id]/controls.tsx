"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { setItemResultAction, signChecklistAction, completeChecklistAction } from "./actions";

const RESULT_VARIANT: Record<string, "gray" | "green" | "red" | "yellow" | "blue"> = {
  non_compilato: "gray",
  conforme: "green",
  non_conforme: "red",
  non_applicabile: "blue",
  limitato: "yellow",
};

export function ChecklistItemControl({ item, checklistId }: { item: any; checklistId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [notes, setNotes] = useState(item.notes || "");

  function setResult(result: string) {
    startTransition(async () => {
      const r = await setItemResultAction(item.id, result, notes);
      if (r?.error) toast.error(r.error);
      else {
        toast.success(`Item: ${result.replace(/_/g, " ")}`);
        router.refresh();
      }
    });
  }

  return (
    <div className="rounded-md border border-leo-border bg-leo-card/40 p-3">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs text-leo-muted">#{item.ordering + 1}</span>
            {item.required && <Badge variant="outline" className="text-[10px]">obbligatorio</Badge>}
            {item.is_critical && <Badge variant="red" className="text-[10px]">critico</Badge>}
            {item.attachment_required && <Badge variant="orange" className="text-[10px]">allegato richiesto</Badge>}
          </div>
          <div className="mt-1 font-medium text-sm">{item.question}</div>
          {item.expected_evidence && (
            <div className="text-xs text-leo-muted mt-1">Evidenza attesa: {item.expected_evidence}</div>
          )}
        </div>
        <Badge variant={RESULT_VARIANT[item.result] ?? "gray"}>{item.result.replace(/_/g, " ")}</Badge>
      </div>
      <Textarea
        placeholder="Note opzionali..."
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={1}
        className="text-xs"
      />
      <div className="mt-2 flex gap-1">
        <Button size="sm" variant="outline" disabled={isPending} onClick={() => setResult("conforme")}>✓ Conforme</Button>
        <Button size="sm" variant="outline" disabled={isPending} onClick={() => setResult("non_conforme")}>✗ Non conforme</Button>
        <Button size="sm" variant="outline" disabled={isPending} onClick={() => setResult("limitato")}>~ Limitato</Button>
        <Button size="sm" variant="ghost" disabled={isPending} onClick={() => setResult("non_applicabile")}>N/A</Button>
      </div>
      {item.attachment_required && !item.attachment_file_id && (
        <p className="mt-2 text-xs text-status-orange">⚠ Allegato obbligatorio (upload in arrivo nello sprint mobile)</p>
      )}
      {item.compiled_by && (
        <p className="mt-2 text-[10px] text-leo-muted">
          Compilato da {item.compiled_by.first_name} {item.compiled_by.last_name}
        </p>
      )}
    </div>
  );
}

export function SignButton({ checklistId }: { checklistId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  function handle() {
    startTransition(async () => {
      const r = await signChecklistAction(checklistId);
      if (r?.error) toast.error(r.error);
      else { toast.success("Checklist firmata"); router.refresh(); }
    });
  }
  return (
    <Button variant="outline" onClick={handle} disabled={isPending} className="w-full">
      ✍️ Firma checklist come responsabile
    </Button>
  );
}

export function CompleteButton({ checklistId, canComplete, alreadyDone }: { checklistId: string; canComplete: boolean; alreadyDone: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  function handle() {
    startTransition(async () => {
      const r = await completeChecklistAction(checklistId);
      if (r?.error) toast.error(r.error);
      else { toast.success("Checklist completata"); router.refresh(); }
    });
  }
  if (alreadyDone) return null;
  return (
    <Button onClick={handle} disabled={isPending || !canComplete} className="w-full">
      {isPending ? "Completamento..." : canComplete ? "Completa checklist" : "Mancano item obbligatori"}
    </Button>
  );
}
