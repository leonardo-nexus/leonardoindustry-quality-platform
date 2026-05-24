"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Camera, CheckCircle2, AlertTriangle, Loader2, FileSignature, Hand } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  takeInChargeAction,
  uploadReceptionPhotoAction,
  recordCountAction,
  signReceptionAction,
} from "../actions";

const PHOTOS: { type: "bolla" | "colli" | "etichetta" | "materiale"; label: string }[] = [
  { type: "bolla", label: "Foto bolla" },
  { type: "colli", label: "Foto colli" },
  { type: "etichetta", label: "Foto etichetta" },
  { type: "materiale", label: "Foto materiale" },
];

export function ReceptionFlow({ reception }: { reception: any }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [bolla, setBolla] = useState<string>(String(reception.bolla_quantity ?? ""));
  const [counted, setCounted] = useState<string>(String(reception.counted_quantity ?? ""));
  const [actualDest, setActualDest] = useState<string>(reception.actual_destination ?? "");
  const [notes, setNotes] = useState<string>(reception.notes ?? "");
  const [damageNotes, setDamageNotes] = useState<string>(reception.damage_notes ?? "");

  function take() {
    startTransition(async () => {
      const r = await takeInChargeAction(reception.id);
      if (r?.error) toast.error(r.error);
      else { toast.success("Presa in carico"); router.refresh(); }
    });
  }

  function saveCount() {
    startTransition(async () => {
      const r = await recordCountAction(reception.id, Number(bolla || 0), Number(counted || 0), actualDest || null);
      if (r?.error) toast.error(r.error);
      else {
        if (r.count_matches && r.destination_matches) toast.success("Conteggio e destinazione OK");
        else toast.warning("⚠ Discrepanza rilevata: vedrai blocco/NC al firmare");
        router.refresh();
      }
    });
  }

  function sign(status: "conforme" | "non_conforme" | "parziale" | "bloccato") {
    startTransition(async () => {
      const r = await signReceptionAction(reception.id, status, notes || undefined, damageNotes || undefined);
      if (r?.error) toast.error(r.error);
      else {
        toast.success(status === "conforme" ? "Firmata conforme" : `Firmata ${status}: NC aperta`);
        router.refresh();
      }
    });
  }

  const canSign = PHOTOS.every((p) => reception[`photo_${p.type}_id`]) && reception.counted_quantity != null;
  const isSigned = !!reception.operator_signature_at;

  return (
    <div className="space-y-4">
      {/* STEP 1: Presa in carico */}
      <Step n={1} title="Presa in carico operatore" done={!!reception.taken_in_charge_at}>
        {!reception.taken_in_charge_at ? (
          <Button size="sm" onClick={take} disabled={pending}>
            {pending ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Hand className="mr-1 h-3 w-3" />}
            Prendo in carico questa ricezione
          </Button>
        ) : (
          <p className="text-xs text-status-green">✓ In carico dal {new Date(reception.taken_in_charge_at).toLocaleString("it-IT")}</p>
        )}
      </Step>

      {/* STEP 2: Foto live */}
      <Step n={2} title="Foto live (4 obbligatorie)" done={PHOTOS.every((p) => reception[`photo_${p.type}_id`])}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {PHOTOS.map((p) => (
            <PhotoUploader
              key={p.type}
              receptionId={reception.id}
              type={p.type}
              label={p.label}
              uploaded={!!reception[`photo_${p.type}_id`]}
              disabled={isSigned}
            />
          ))}
        </div>
      </Step>

      {/* STEP 3: Conteggio + destinazione */}
      <Step n={3} title="Conteggio pezzi e destinazione" done={reception.counted_quantity != null}>
        <div className="grid gap-2 sm:grid-cols-3">
          <label className="block text-xs">
            <span className="block text-leo-muted mb-1">Qty da bolla</span>
            <Input type="number" step="0.001" value={bolla} onChange={(e) => setBolla(e.target.value)} disabled={isSigned} />
          </label>
          <label className="block text-xs">
            <span className="block text-leo-muted mb-1">Qty contata</span>
            <Input type="number" step="0.001" value={counted} onChange={(e) => setCounted(e.target.value)} disabled={isSigned} />
          </label>
          <label className="block text-xs">
            <span className="block text-leo-muted mb-1">Destinazione effettiva</span>
            <Input value={actualDest} onChange={(e) => setActualDest(e.target.value)} disabled={isSigned} placeholder={reception.expected_destination ?? "—"} />
          </label>
        </div>
        {reception.expected_quantity != null && (
          <p className="mt-2 text-xs text-leo-muted">Atteso dal sistema: {reception.expected_quantity} {reception.expected_destination ? `→ ${reception.expected_destination}` : ""}</p>
        )}
        <Button size="sm" variant="outline" onClick={saveCount} disabled={pending || isSigned} className="mt-2">
          {pending ? "..." : "Salva conteggio"}
        </Button>
        {reception.count_matches === false && <Badge variant="red" className="ml-2">⚠ Quantità diverse</Badge>}
        {reception.destination_matches === false && <Badge variant="red" className="ml-2">⚠ Destinazione errata</Badge>}
      </Step>

      {/* STEP 4: Firma + esito */}
      <Step n={4} title="Firma operatore + esito conformità" done={isSigned}>
        {isSigned ? (
          <div className="rounded-md border border-status-green/30 bg-status-green/5 p-3 text-sm">
            <FileSignature className="inline h-4 w-4 mr-1 text-status-green" />
            Firmata con esito: <Badge variant={reception.conformity_status === "conforme" ? "green" : "red"}>{reception.conformity_status}</Badge>
          </div>
        ) : (
          <>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Note generali" className="mb-2" />
            <Textarea rows={2} value={damageNotes} onChange={(e) => setDamageNotes(e.target.value)} placeholder="Note danni / anomalie" className="mb-3" />
            {!canSign && <p className="mb-2 text-xs text-status-orange">⚠ Per firmare servono tutte le 4 foto + conteggio</p>}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" disabled={pending || !canSign} onClick={() => sign("conforme")} className="bg-status-green/20 text-status-green hover:bg-status-green/30 border border-status-green/40">
                <CheckCircle2 className="mr-1 h-3 w-3" /> Firma CONFORME
              </Button>
              <Button size="sm" variant="outline" disabled={pending || !canSign} onClick={() => sign("parziale")} className="border-status-orange/40 text-status-orange">
                Parziale
              </Button>
              <Button size="sm" variant="outline" disabled={pending || !canSign} onClick={() => sign("non_conforme")} className="border-status-red/40 text-status-red">
                <AlertTriangle className="mr-1 h-3 w-3" /> NON conforme (apre NC)
              </Button>
              <Button size="sm" variant="destructive" disabled={pending || !canSign} onClick={() => sign("bloccato")}>
                <AlertTriangle className="mr-1 h-3 w-3" /> BLOCCATO (apre NC + loss)
              </Button>
            </div>
          </>
        )}
      </Step>
    </div>
  );
}

function Step({ n, title, done, children }: { n: number; title: string; done: boolean; children: React.ReactNode }) {
  return (
    <div className={`rounded-md border p-3 ${done ? "border-status-green/30 bg-status-green/5" : "border-leo-border bg-leo-card/30"}`}>
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
        <span className={`flex h-6 w-6 items-center justify-center rounded-full font-mono ${done ? "bg-status-green text-white" : "bg-leo-border text-leo-muted"}`}>{done ? "✓" : n}</span>
        {title}
      </div>
      {children}
    </div>
  );
}

function PhotoUploader({ receptionId, type, label, uploaded, disabled }: { receptionId: string; type: "bolla" | "colli" | "etichetta" | "materiale"; label: string; uploaded: boolean; disabled: boolean }) {
  const router = useRouter();
  const ref = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();

  function handleFile(file: File | null) {
    if (!file) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.append("file", file);
      const r = await uploadReceptionPhotoAction(receptionId, type, fd);
      if (r?.error) toast.error(r.error);
      else { toast.success(`Foto ${type} caricata`); router.refresh(); }
    });
  }

  return (
    <div className="text-center">
      <input ref={ref} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFile(e.target.files?.[0] ?? null)} />
      <Button
        size="sm"
        variant={uploaded ? "outline" : "secondary"}
        disabled={pending || disabled}
        onClick={() => ref.current?.click()}
        className="w-full text-xs"
      >
        {pending ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : uploaded ? <CheckCircle2 className="mr-1 h-3 w-3 text-status-green" /> : <Camera className="mr-1 h-3 w-3" />}
        {label}
      </Button>
    </div>
  );
}
