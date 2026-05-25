"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Camera,
  ScanLine,
  Paperclip,
  Mic,
  Loader2,
  ArrowRight,
  CheckCircle2,
  Image as ImageIcon,
  RefreshCw,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { uploadMobileEvidenceAction } from "@/components/mobile/actions";

export type EvidenceMode = "photo" | "scan" | "file" | "audio";

export type EvidenceProject = {
  id: string;
  code: string;
  name: string;
  company_id: string;
};

const MODE_META: Record<
  EvidenceMode,
  {
    title: string;
    description: string;
    kind: "foto" | "scan_documento" | "allegato";
    evidence_type: string;
    accept: string;
    capture: "environment" | undefined;
    icon: typeof Camera;
    capturedFirst: boolean;
  }
> = {
  photo: {
    title: "Scatta foto sul cantiere",
    description: "Foto di controllo, materiale, etichetta o seriale.",
    kind: "foto",
    evidence_type: "foto_controllo",
    accept: "image/*",
    capture: "environment",
    icon: Camera,
    capturedFirst: true,
  },
  scan: {
    title: "Scannerizza documento",
    description:
      "Bolla, DDT, certificato 3.1, verbale firmato. Verrà indicizzato e inviato all'OCR.",
    kind: "scan_documento",
    evidence_type: "documento_scansionato",
    accept: "image/*,application/pdf",
    capture: "environment",
    icon: ScanLine,
    capturedFirst: true,
  },
  file: {
    title: "Carica documento esistente",
    description: "Qualsiasi file dal dispositivo, archiviato sulla commessa.",
    kind: "allegato",
    evidence_type: "documento_scansionato",
    accept: "*/*",
    capture: undefined,
    icon: Paperclip,
    capturedFirst: false,
  },
  audio: {
    title: "Nota vocale",
    description: "Allega un file audio come memo operativo.",
    kind: "allegato",
    evidence_type: "video_breve",
    accept: "audio/*",
    capture: undefined,
    icon: Mic,
    capturedFirst: false,
  },
};

const REFERENCE_TYPES = [
  { value: "", label: "— solo commessa —" },
  { value: "ddt", label: "DDT / Bolla fornitore" },
  { value: "certificato", label: "Certificato qualità (3.1, CE)" },
  { value: "material_reception", label: "Ricezione materiale" },
  { value: "checklist", label: "Item di checklist" },
  { value: "non_conformity", label: "Non conformità" },
  { value: "asset", label: "Asset / strumento" },
  { value: "saldatura", label: "Saldatura / WPS" },
  { value: "altro", label: "Altro" },
];

async function compressImageIfNeeded(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  if (file.size < 600 * 1024) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const maxSide = 1600;
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    const blob: Blob | null = await new Promise((res) =>
      canvas.toBlob((b) => res(b), "image/jpeg", 0.85),
    );
    if (!blob || blob.size >= file.size) return file;
    const newName = file.name.replace(/\.(heic|heif|png|webp|jpg|jpeg)$/i, "") + ".jpg";
    return new File([blob], newName, { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    return file;
  }
}

export function EvidenceQuickWizard({
  mode,
  projects,
  defaultProjectId,
  trigger,
}: {
  mode: EvidenceMode;
  projects: EvidenceProject[];
  defaultProjectId?: string;
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const meta = MODE_META[mode];
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"capture" | "context" | "done">(
    meta.capturedFirst ? "capture" : "context",
  );
  const [projectId, setProjectId] = useState<string>(
    defaultProjectId ?? projects[0]?.id ?? "",
  );
  const [referenceType, setReferenceType] = useState<string>("");
  const [referenceCode, setReferenceCode] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const selectedProject = projects.find((p) => p.id === projectId);
  const Icon = meta.icon;

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function reset() {
    setStep(meta.capturedFirst ? "capture" : "context");
    setReferenceType("");
    setReferenceCode("");
    setNotes("");
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setCapturedFile(null);
    setPreviewUrl(null);
  }

  async function onCapture(file: File | null) {
    if (!file) return;
    const compressed = await compressImageIfNeeded(file);
    if (compressed !== file) {
      toast.message(`Foto ottimizzata a ${Math.round(compressed.size / 1024)} KB`);
    }
    setCapturedFile(compressed);
    if (compressed.type.startsWith("image/")) {
      setPreviewUrl(URL.createObjectURL(compressed));
    }
    setStep("context");
  }

  function performUpload(file: File) {
    if (!selectedProject) {
      toast.error("Seleziona una commessa");
      return;
    }
    startTransition(async () => {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("kind", meta.kind);
      fd.append("entity_type", "project");
      fd.append("entity_id", selectedProject.id);
      fd.append("company_id", selectedProject.company_id);
      fd.append("project_id", selectedProject.id);
      fd.append("evidence_type", meta.evidence_type);

      const composedNotes = [
        referenceType ? `${referenceType}${referenceCode ? `:${referenceCode}` : ""}` : null,
        notes.trim() || null,
      ]
        .filter(Boolean)
        .join(" · ");
      if (composedNotes) fd.append("notes", composedNotes);

      fd.append(
        "device_info",
        `${navigator.userAgent} · ${window.screen.width}x${window.screen.height}`,
      );

      const pos: GeolocationPosition | null = await new Promise((resolve) => {
        if (!navigator.geolocation) return resolve(null);
        navigator.geolocation.getCurrentPosition(
          (p) => resolve(p),
          () => resolve(null),
          { timeout: 2500 },
        );
      });
      if (pos) {
        fd.append("latitude", String(pos.coords.latitude));
        fd.append("longitude", String(pos.coords.longitude));
      }

      const r = await uploadMobileEvidenceAction(fd);
      if (r?.error) {
        toast.error(r.error);
        return;
      }
      toast.success(`Evidenza caricata su ${selectedProject.code}`);
      if (r.signature_id) toast.success("Firma applicativa registrata", { duration: 2000 });
      setStep("done");
      router.refresh();
    });
  }

  function onFileForNonCaptured(file: File | null) {
    if (!file) return;
    startTransition(async () => {
      const compressed = await compressImageIfNeeded(file);
      performUpload(compressed);
    });
  }

  const contextValid = projectId && notes.trim().length >= 5;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setTimeout(reset, 200);
      }}
    >
      <div onClick={() => setOpen(true)}>{trigger}</div>
      <DialogContent className="w-[calc(100vw-1rem)] max-w-lg max-h-[92vh] overflow-y-auto rounded-lg p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-brand-cyan" /> {meta.title}
          </DialogTitle>
          <DialogDescription>{meta.description}</DialogDescription>
        </DialogHeader>

        {step === "capture" && (
          <div className="space-y-4 py-2">
            <p className="text-sm text-leo-muted">
              {mode === "photo"
                ? "Inquadra il soggetto e scatta. Poi indicherai a quale commessa appartiene."
                : "Inquadra il documento (DDT, certificato, bolla). Poi indicherai la commessa."}
            </p>
            <input
              ref={fileRef}
              type="file"
              accept={meta.accept}
              capture={meta.capture}
              className="hidden"
              onChange={(e) => onCapture(e.target.files?.[0] ?? null)}
            />
            <Button
              size="lg"
              className="h-28 w-full text-base"
              onClick={() => fileRef.current?.click()}
            >
              <Icon className="mr-2 h-7 w-7" />
              {mode === "photo" ? "Apri fotocamera" : "Apri fotocamera o scegli PDF"}
            </Button>
          </div>
        )}

        {step === "context" && (
          <div className="space-y-4 py-2">
            {capturedFile && (
              <div className="rounded-md border border-leo-border bg-leo-sidebar/60 p-2">
                {previewUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={previewUrl}
                    alt="anteprima"
                    className="max-h-48 w-full rounded object-contain"
                  />
                ) : (
                  <div className="flex items-center gap-2 p-2 text-sm">
                    <ImageIcon className="h-4 w-4 text-brand-cyan" />
                    <span className="truncate">{capturedFile.name}</span>
                  </div>
                )}
                <div className="mt-1 flex items-center justify-between text-xs text-leo-muted">
                  <span>{Math.round(capturedFile.size / 1024)} KB</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (previewUrl) URL.revokeObjectURL(previewUrl);
                      setCapturedFile(null);
                      setPreviewUrl(null);
                      setStep("capture");
                    }}
                    className="inline-flex items-center gap-1 text-brand-cyan hover:underline"
                  >
                    <RefreshCw className="h-3 w-3" /> Rifai
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="ew-project">Commessa di destinazione *</Label>
              <select
                id="ew-project"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full rounded-md border border-leo-border bg-leo-card px-3 py-2.5 text-base sm:text-sm"
              >
                {projects.length === 0 && <option value="">— nessuna commessa attiva —</option>}
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} — {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="ew-ref-type">Riferimento</Label>
                <select
                  id="ew-ref-type"
                  value={referenceType}
                  onChange={(e) => setReferenceType(e.target.value)}
                  className="w-full rounded-md border border-leo-border bg-leo-card px-3 py-2.5 text-base sm:text-sm"
                >
                  {REFERENCE_TYPES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ew-ref-code">Codice / numero</Label>
                <input
                  id="ew-ref-code"
                  type="text"
                  value={referenceCode}
                  onChange={(e) => setReferenceCode(e.target.value)}
                  placeholder="es. DDT 1234/2026"
                  disabled={!referenceType}
                  className="w-full rounded-md border border-leo-border bg-leo-card px-3 py-2.5 text-base sm:text-sm disabled:opacity-50"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ew-notes">Cosa stai documentando? *</Label>
              <Textarea
                id="ew-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="es. Controllo accettazione cavi MT, etichetta CE leggibile"
                rows={3}
                className="text-base sm:text-sm"
              />
              <p className="text-xs text-leo-muted">
                Min 5 caratteri. Senza descrizione l&apos;evidenza resta in quarantena.
              </p>
            </div>

            {!meta.capturedFirst && !capturedFile && (
              <>
                <input
                  ref={fileRef}
                  type="file"
                  accept={meta.accept}
                  capture={meta.capture}
                  className="hidden"
                  onChange={(e) => onFileForNonCaptured(e.target.files?.[0] ?? null)}
                />
                <Button
                  size="lg"
                  className="h-20 w-full text-base"
                  onClick={() => fileRef.current?.click()}
                  disabled={!contextValid || pending}
                >
                  {pending ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Caricamento…
                    </>
                  ) : (
                    <>
                      <Icon className="mr-2 h-5 w-5" />{" "}
                      {mode === "audio" ? "Scegli file audio" : "Scegli file"}
                    </>
                  )}
                </Button>
              </>
            )}

            {meta.capturedFirst && (
              <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
                <Button
                  variant="ghost"
                  className="w-full sm:w-auto"
                  onClick={() => setStep("capture")}
                  disabled={pending}
                >
                  Indietro
                </Button>
                <Button
                  className="w-full sm:w-auto"
                  onClick={() => capturedFile && performUpload(capturedFile)}
                  disabled={!capturedFile || !contextValid || pending}
                >
                  {pending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Caricamento…
                    </>
                  ) : (
                    <>
                      Salva evidenza <ArrowRight className="ml-1 h-4 w-4" />
                    </>
                  )}
                </Button>
              </DialogFooter>
            )}
          </div>
        )}

        {step === "done" && (
          <div className="space-y-4 py-6 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-status-green" />
            <div>
              <div className="text-lg font-semibold">Evidenza registrata</div>
              <div className="text-sm text-leo-muted">
                Archiviata sulla commessa {selectedProject?.code}. Già nel feed live.
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => reset()}
              >
                Carica un&apos;altra
              </Button>
              <Button className="w-full sm:w-auto" onClick={() => setOpen(false)}>
                Chiudi
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
