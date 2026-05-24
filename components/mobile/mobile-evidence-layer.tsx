"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Camera, ScanLine, Paperclip, FileSignature, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadMobileEvidenceAction } from "./actions";
import { SignaturePad } from "./signature-pad";

export type MobileEvidenceKind =
  | "foto"
  | "scan_documento"
  | "allegato"
  | "firma"
  | "nc";

export interface MobileEvidenceContext {
  entity_type: string;
  entity_id: string;
  company_id?: string | null;
  project_id?: string | null;
  evidence_type?: string;
  notes?: string;
}

/**
 * Mobile Evidence Layer: 5 bottoni standard riusabili in ogni pagina core.
 *
 * - Scatta foto (camera posteriore via capture=environment)
 * - Scansiona documento (PDF o foto documento)
 * - Carica allegato (file qualsiasi)
 * - Firma (futuro: canvas firma digitale)
 * - Apri NC (link veloce a creazione NC con entity prefill)
 *
 * Tutti i campi user vengono presi dalla sessione server-side. Geolocation best-effort.
 * Crea automaticamente record live_evidence + applicative_signature.
 */
export function MobileEvidenceLayer({ context, allowed = ["foto", "scan_documento", "allegato", "nc"], compact = false }: {
  context: MobileEvidenceContext;
  allowed?: MobileEvidenceKind[];
  compact?: boolean;
}) {
  const router = useRouter();
  const photoRef = useRef<HTMLInputElement>(null);
  const scanRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();

  function handleFile(kind: MobileEvidenceKind, file: File | null) {
    if (!file) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("kind", kind);
      fd.append("entity_type", context.entity_type);
      fd.append("entity_id", context.entity_id);
      if (context.company_id) fd.append("company_id", context.company_id);
      if (context.project_id) fd.append("project_id", context.project_id);
      if (context.evidence_type) fd.append("evidence_type", context.evidence_type);
      if (context.notes) fd.append("notes", context.notes);
      fd.append("device_info", `${navigator.userAgent} · ${window.screen.width}x${window.screen.height}`);

      // Geo best-effort
      const pos: GeolocationPosition | null = await new Promise((resolve) => {
        if (!navigator.geolocation) return resolve(null);
        navigator.geolocation.getCurrentPosition((p) => resolve(p), () => resolve(null), { timeout: 3000 });
      });
      if (pos) {
        fd.append("latitude", String(pos.coords.latitude));
        fd.append("longitude", String(pos.coords.longitude));
      }

      const r = await uploadMobileEvidenceAction(fd);
      if (r?.error) toast.error(r.error);
      else {
        toast.success(`${kind === "foto" ? "Foto" : kind === "scan_documento" ? "Documento" : "Allegato"} caricato`);
        if (r.signature_id) toast.success("Firma applicativa registrata", { duration: 2000 });
        router.refresh();
      }
    });
  }

  if (compact) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {allowed.includes("foto") && (
          <>
            <input ref={photoRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFile("foto", e.target.files?.[0] ?? null)} />
            <Button size="sm" variant="outline" disabled={pending} onClick={() => photoRef.current?.click()}>
              {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />}
            </Button>
          </>
        )}
        {allowed.includes("allegato") && (
          <>
            <input ref={fileRef} type="file" className="hidden" onChange={(e) => handleFile("allegato", e.target.files?.[0] ?? null)} />
            <Button size="sm" variant="ghost" disabled={pending} onClick={() => fileRef.current?.click()}><Paperclip className="h-3 w-3" /></Button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
      <input ref={photoRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFile("foto", e.target.files?.[0] ?? null)} />
      <input ref={scanRef} type="file" accept="image/*,application/pdf" capture="environment" className="hidden" onChange={(e) => handleFile("scan_documento", e.target.files?.[0] ?? null)} />
      <input ref={fileRef} type="file" className="hidden" onChange={(e) => handleFile("allegato", e.target.files?.[0] ?? null)} />

      {allowed.includes("foto") && (
        <MobileButton
          icon={<Camera className="h-6 w-6" />}
          label="Scatta foto"
          onClick={() => photoRef.current?.click()}
          pending={pending}
          color="brand-cyan"
        />
      )}
      {allowed.includes("scan_documento") && (
        <MobileButton
          icon={<ScanLine className="h-6 w-6" />}
          label="Scansiona doc"
          onClick={() => scanRef.current?.click()}
          pending={pending}
          color="brand-cyan"
        />
      )}
      {allowed.includes("allegato") && (
        <MobileButton
          icon={<Paperclip className="h-6 w-6" />}
          label="Allega file"
          onClick={() => fileRef.current?.click()}
          pending={pending}
          color="leo-muted"
        />
      )}
      {allowed.includes("firma") && (
        <SignaturePad context={{ entity_type: context.entity_type, entity_id: context.entity_id, company_id: context.company_id, project_id: context.project_id }} />
      )}
      {allowed.includes("nc") && (
        <MobileButton
          icon={<AlertTriangle className="h-6 w-6" />}
          label="Apri NC"
          onClick={() => {
            const url = `/non-conformities/new?entity_type=${encodeURIComponent(context.entity_type)}&entity_id=${encodeURIComponent(context.entity_id)}`;
            if (typeof window !== "undefined") window.location.href = url;
          }}
          pending={false}
          color="status-red"
        />
      )}
    </div>
  );
}

function MobileButton({ icon, label, onClick, pending, color }: { icon: React.ReactNode; label: string; onClick: () => void; pending: boolean; color: string }) {
  const borderClass = `border-${color}/40`;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className={`mobile-camera-btn ${borderClass} disabled:opacity-50`}
    >
      {pending ? <Loader2 className="h-6 w-6 animate-spin" /> : icon}
      <span className="font-medium">{label}</span>
    </button>
  );
}
