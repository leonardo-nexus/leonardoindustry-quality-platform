"use client";
import { useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const REASON_TYPES = [
  { value: "correzione_errore", label: "Correzione errore" },
  { value: "aggiornamento_normativo", label: "Aggiornamento normativo" },
  { value: "modifica_cliente", label: "Modifica cliente" },
  { value: "modifica_processo", label: "Modifica processo" },
  { value: "aggiornamento_scadenza", label: "Aggiornamento scadenza" },
  { value: "aggiornamento_documento", label: "Aggiornamento documento" },
  { value: "revisione_periodica", label: "Revisione periodica" },
  { value: "altro", label: "Altro" },
];

export function ChangeReasonDialog({
  open,
  onCancel,
  onConfirm,
  required = true,
  title = "Motivo modifica",
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: (reason: string, type: string) => void;
  required?: boolean;
  title?: string;
}) {
  const [type, setType] = useState("correzione_errore");
  const [reason, setReason] = useState("");

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Per oggetti critici il motivo è obbligatorio. La modifica viene firmata automaticamente con la tua identità e tracciata in audit log.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block text-leo-muted">Tipo modifica</span>
            <select
              className="w-full rounded-md border border-leo-border bg-leo-card px-2 py-1.5 text-sm"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              {REASON_TYPES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-leo-muted">Descrizione motivo {required && <span className="text-status-red">*</span>}</span>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Es: aggiornata data scadenza secondo nuova proroga cliente"
            />
          </label>
        </div>
        <DialogFooter className="flex-row justify-end gap-2 sm:gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel}>Annulla</Button>
          <Button
            size="sm"
            disabled={required && reason.trim().length < 3}
            onClick={() => onConfirm(reason.trim(), type)}
          >
            Salva con motivo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
