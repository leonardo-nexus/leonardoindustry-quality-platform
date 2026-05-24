"use client";
import { useRef, useState, useTransition } from "react";
import { Upload, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CompanyLogo } from "@/components/layout/company-logo";
import { uploadCompanyLogoAction, removeCompanyLogoAction } from "./actions";

const MAX_DIMENSION = 1024; // max lato lungo dopo resize
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

async function downscaleImage(file: File): Promise<File> {
  // SVG: nessun resize, passa così com'è
  if (file.type === "image/svg+xml") return file;

  const dataUrl: string = await new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = dataUrl;
  });

  // Se è già piccola, restituisci l'originale
  if (img.width <= MAX_DIMENSION && img.height <= MAX_DIMENSION && file.size < 1.5 * 1024 * 1024) {
    return file;
  }

  // Calcola nuove dimensioni mantenendo aspect ratio
  const scale = Math.min(MAX_DIMENSION / img.width, MAX_DIMENSION / img.height, 1);
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;

  // Sfondo trasparente per PNG/WebP, bianco per JPG
  if (file.type === "image/jpeg") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, w, h);

  // Esporta nello stesso formato (WebP per PNG così è più leggero, JPG resta JPG)
  const outType = file.type === "image/jpeg" ? "image/jpeg" : "image/webp";
  const outExt = outType === "image/jpeg" ? "jpg" : "webp";
  const quality = outType === "image/jpeg" ? 0.92 : 0.92;

  const blob: Blob = await new Promise((res, rej) => {
    canvas.toBlob((b) => (b ? res(b) : rej(new Error("toBlob failed"))), outType, quality);
  });
  const baseName = file.name.replace(/\.[^.]+$/, "");
  return new File([blob], `${baseName}.${outExt}`, { type: outType });
}

export function LogoUpload({
  companyId,
  companyName,
  currentLogoUrl,
}: {
  companyId: string;
  companyName: string;
  currentLogoUrl: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(currentLogoUrl);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsOptimizing(true);
    let processed: File;
    try {
      processed = await downscaleImage(file);
    } catch (err) {
      setIsOptimizing(false);
      toast.error("Impossibile leggere l'immagine");
      return;
    }
    setIsOptimizing(false);

    if (processed.size > MAX_BYTES) {
      toast.error(`Logo ancora troppo grande dopo ottimizzazione (${(processed.size / 1024 / 1024).toFixed(1)} MB > 5 MB)`);
      return;
    }

    const wasResized = processed !== file;
    if (wasResized) {
      toast.info(
        `Ottimizzato: ${(file.size / 1024 / 1024).toFixed(1)} MB → ${(processed.size / 1024 / 1024).toFixed(2)} MB`,
      );
    }

    const fd = new FormData();
    fd.append("company_id", companyId);
    fd.append("file", processed);
    startTransition(async () => {
      const r = await uploadCompanyLogoAction(fd);
      if (r?.error) toast.error(r.error);
      else {
        toast.success("Logo caricato");
        setLogoUrl(r.url ?? null);
        if (inputRef.current) inputRef.current.value = "";
      }
    });
  }

  function handleRemove() {
    startTransition(async () => {
      const r = await removeCompanyLogoAction(companyId);
      if (r?.error) toast.error(r.error);
      else {
        toast.success("Logo rimosso");
        setLogoUrl(null);
      }
    });
  }

  const busy = isPending || isOptimizing;

  return (
    <div className="flex items-center gap-4">
      <CompanyLogo name={companyName} logoUrl={logoUrl} size="xl" />
      <div className="flex flex-col gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/svg+xml,image/webp"
          onChange={handleFile}
          className="hidden"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
        >
          <Upload className="h-4 w-4" />{" "}
          {isOptimizing
            ? "Ottimizzo..."
            : isPending
              ? "Carico..."
              : logoUrl
                ? "Sostituisci"
                : "Carica logo"}
        </Button>
        {logoUrl && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            disabled={busy}
            className="text-status-red hover:text-status-red"
          >
            <Trash2 className="h-4 w-4" /> Rimuovi
          </Button>
        )}
        <p className="text-xs text-leo-muted">
          PNG/JPG/SVG/WEBP · ridimensionato auto a 1024px · max 5 MB
        </p>
      </div>
    </div>
  );
}
