"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Camera, Paperclip, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  setItemResultAction,
  signChecklistAction,
  completeChecklistAction,
  uploadChecklistItemEvidenceAction,
} from "./actions";

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
      <EvidenceUploader itemId={item.id} hasAttachment={!!item.attachment_file_id} required={!!item.attachment_required} />
      {item.compiled_by && (
        <p className="mt-2 text-[10px] text-leo-muted">
          Compilato da {item.compiled_by.first_name} {item.compiled_by.last_name}
        </p>
      )}
    </div>
  );
}

function EvidenceUploader({ itemId, hasAttachment, required }: { itemId: string; hasAttachment: boolean; required: boolean }) {
  const router = useRouter();
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  function handleUpload(file: File | null) {
    if (!file) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("device_info", `${navigator.userAgent} · ${window.screen.width}x${window.screen.height}`);

      // Geolocation best-effort (non bloccante)
      const geoPromise = new Promise<GeolocationPosition | null>((resolve) => {
        if (!navigator.geolocation) return resolve(null);
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve(pos),
          () => resolve(null),
          { timeout: 3000, enableHighAccuracy: false },
        );
      });
      const pos = await geoPromise;
      if (pos) {
        fd.append("latitude", String(pos.coords.latitude));
        fd.append("longitude", String(pos.coords.longitude));
      }

      const r = await uploadChecklistItemEvidenceAction(itemId, fd);
      if (r?.error) toast.error(r.error);
      else {
        if (r.duplicate) {
          toast.warning("Evidenza caricata ma SOSPETTA: stessa foto già usata altrove (SHA256 duplicato)");
        } else if ((r.suspicion_flags?.length ?? 0) > 0) {
          toast.warning(`Evidenza caricata con flag: ${r.suspicion_flags!.join(", ")}`);
        } else {
          toast.success("Evidenza caricata correttamente");
        }
        router.refresh();
      }
    });
  }

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex flex-wrap gap-1.5">
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => handleUpload(e.target.files?.[0] ?? null)}
        />
        <input
          ref={fileRef}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={(e) => handleUpload(e.target.files?.[0] ?? null)}
        />
        <Button
          size="sm"
          variant={hasAttachment ? "outline" : (required ? "destructive" : "secondary")}
          disabled={isPending}
          onClick={() => cameraRef.current?.click()}
          className="flex items-center gap-1"
        >
          {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />}
          Scatta foto
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={isPending}
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-1"
        >
          <Paperclip className="h-3 w-3" />
          Allega file
        </Button>
        {hasAttachment && (
          <Badge variant="green" className="flex items-center gap-1 text-[10px]">
            <CheckCircle2 className="h-3 w-3" /> evidenza presente
          </Badge>
        )}
      </div>
      {required && !hasAttachment && (
        <p className="text-xs text-status-orange">⚠ Allegato obbligatorio per chiudere la checklist</p>
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
