"use client";
import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function DeleteConfirmDialog({
  open,
  onCancel,
  onConfirm,
  entityLabel = "questo elemento",
  forceArchive = false,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: (reason: string, action: "delete" | "archive") => void;
  entityLabel?: string;
  forceArchive?: boolean;
}) {
  const [reason, setReason] = useState("");

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-md border-status-red/40">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-status-red" />
            <DialogTitle>
              {forceArchive ? "Archivia" : "Elimina"} {entityLabel}
            </DialogTitle>
          </div>
          <DialogDescription>
            {forceArchive
              ? "Questo record è usato da altri dati. Non può essere eliminato fisicamente. Puoi solo archiviarlo (resta consultabile in storico)."
              : "Soft delete: il record viene marcato come eliminato ma resta consultabile in storico. Nessuna cancellazione fisica."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <label className="block text-sm">
            <span className="mb-1 block text-leo-muted">Motivo {forceArchive ? "archiviazione" : "eliminazione"} <span className="text-status-red">*</span></span>
            <Textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Es: duplicato del documento DOC-123 caricato per errore"
            />
          </label>
        </div>
        <DialogFooter className="flex-row justify-end gap-2 sm:gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel}>Annulla</Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={reason.trim().length < 3}
            onClick={() => onConfirm(reason.trim(), forceArchive ? "archive" : "delete")}
          >
            {forceArchive ? "Archivia" : "Elimina"} con motivo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
