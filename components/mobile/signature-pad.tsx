"use client";
import { useRef, useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileSignature, Eraser, Save, Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { uploadMobileEvidenceAction } from "./actions";

interface Point { x: number; y: number; }

/**
 * Canvas firma grafica. Salva PNG come live_evidence (evidence_type=firma_operatore)
 * + applicative_signature automatica.
 *
 * Disclaimer: NON è firma digitale qualificata. È firma applicativa interna
 * associata all'utente autenticato.
 */
export function SignaturePad({ context, label = "Firma" }: {
  context: { entity_type: string; entity_id: string; company_id?: string | null; project_id?: string | null };
  label?: string;
}) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [open, setOpen] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [lastPoint, setLastPoint] = useState<Point | null>(null);
  const [hasInk, setHasInk] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.strokeStyle = "#0a0a0a";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    setHasInk(false);
  }, [open]);

  function pointer(e: React.PointerEvent<HTMLCanvasElement>): Point {
    const r = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * e.currentTarget.width,
      y: ((e.clientY - r.top) / r.height) * e.currentTarget.height,
    };
  }

  function onDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrawing(true);
    setLastPoint(pointer(e));
  }
  function onMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing || !lastPoint) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const p = pointer(e);
    ctx.beginPath();
    ctx.moveTo(lastPoint.x, lastPoint.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    setLastPoint(p);
    setHasInk(true);
  }
  function onUp() { setDrawing(false); setLastPoint(null); }

  function clear() {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, c.width, c.height);
    setHasInk(false);
  }

  function save() {
    if (!hasInk) return toast.error("Disegna la firma prima di salvare");
    const c = canvasRef.current; if (!c) return;
    c.toBlob(async (blob) => {
      if (!blob) return toast.error("Errore generazione firma");
      const file = new File([blob], `signature-${Date.now()}.png`, { type: "image/png" });
      startTransition(async () => {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("kind", "firma");
        fd.append("entity_type", context.entity_type);
        fd.append("entity_id", context.entity_id);
        if (context.company_id) fd.append("company_id", context.company_id);
        if (context.project_id) fd.append("project_id", context.project_id);
        fd.append("evidence_type", "firma_operatore");
        fd.append("notes", "Firma applicativa interna grafica");
        const r = await uploadMobileEvidenceAction(fd);
        if (r?.error) toast.error(r.error);
        else {
          toast.success("Firma applicativa registrata");
          setOpen(false);
          router.refresh();
        }
      });
    }, "image/png");
  }

  return (
    <>
      <Button variant="outline" className="mobile-action" onClick={() => setOpen(true)}>
        <FileSignature className="mr-2 h-4 w-4" /> {label}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><FileSignature className="h-5 w-5 text-brand-cyan" /> {label}</DialogTitle>
            <DialogDescription className="text-xs">
              ⚠ Firma applicativa interna grafica. NON è firma digitale qualificata. Viene associata all'utente autenticato e registrata in audit log immutabile.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md border-2 border-leo-border bg-white">
            <canvas
              ref={canvasRef}
              width={500}
              height={200}
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerCancel={onUp}
              className="touch-none w-full"
              style={{ aspectRatio: "5/2" }}
            />
          </div>
          <DialogFooter className="flex-row justify-between gap-2 sm:gap-2">
            <Button variant="ghost" size="sm" onClick={clear} disabled={pending}><Eraser className="mr-1 h-3 w-3" /> Pulisci</Button>
            <Button onClick={save} disabled={pending || !hasInk} className="mobile-action">
              {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Salva firma
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
