"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Edit3, Save, X, Trash2, History, GitBranch, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChangeReasonDialog } from "./change-reason-dialog";
import { DeleteConfirmDialog } from "./delete-confirm-dialog";

interface ActionResult {
  error?: string;
  ok?: boolean;
  needsArchive?: boolean;
}

export interface EditToolbarProps {
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (reason: string, type: string) => Promise<ActionResult> | ActionResult;
  onDelete?: (reason: string, action: "delete" | "archive") => Promise<ActionResult> | ActionResult;
  onShowHistory?: () => void;
  onNewRevision?: (reason: string, type: string) => Promise<ActionResult> | ActionResult;
  entityLabel?: string;
  reasonRequired?: boolean;
  canDelete?: boolean;
  canArchive?: boolean;
  hasRevisions?: boolean;
}

/**
 * Toolbar standard per schede dettaglio: Modifica/Salva/Annulla/Elimina/Storico/Nuova revisione.
 * Tutti i salvataggi passano da ChangeReasonDialog (motivo obbligatorio per oggetti critici).
 * Tutte le delete passano da DeleteConfirmDialog (soft delete con motivo).
 */
export function EditToolbar(props: EditToolbarProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showReason, setShowReason] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showRevisionReason, setShowRevisionReason] = useState(false);
  const [forceArchive, setForceArchive] = useState(false);

  function handleSave() {
    if (props.reasonRequired) {
      setShowReason(true);
    } else {
      runSave("", "altro");
    }
  }

  function runSave(reason: string, type: string) {
    setShowReason(false);
    startTransition(async () => {
      const r = await props.onSave(reason, type);
      if (r?.error) toast.error(r.error);
      else {
        toast.success("Modifica salvata e tracciata in audit log");
        router.refresh();
      }
    });
  }

  function runDelete(reason: string, action: "delete" | "archive") {
    setShowDelete(false);
    startTransition(async () => {
      const r = await props.onDelete!(reason, action);
      if (r?.error) toast.error(r.error);
      else if (r?.needsArchive) {
        toast.warning("Record usato da altri dati: usa Archivia");
        setForceArchive(true);
        setShowDelete(true);
      } else {
        toast.success(action === "archive" ? "Archiviato" : "Eliminato (soft delete)");
        router.refresh();
      }
    });
  }

  function runNewRevision(reason: string, type: string) {
    setShowRevisionReason(false);
    startTransition(async () => {
      const r = await props.onNewRevision!(reason, type);
      if (r?.error) toast.error(r.error);
      else {
        toast.success("Nuova revisione creata");
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {!props.isEditing && (
        <>
          <Button size="sm" variant="outline" onClick={props.onEdit} disabled={isPending}>
            <Edit3 className="mr-1 h-3 w-3" /> Modifica
          </Button>
          {props.onShowHistory && (
            <Button size="sm" variant="ghost" onClick={props.onShowHistory}>
              <History className="mr-1 h-3 w-3" /> Storico
            </Button>
          )}
          {props.onNewRevision && (
            <Button size="sm" variant="ghost" onClick={() => setShowRevisionReason(true)} disabled={isPending}>
              <GitBranch className="mr-1 h-3 w-3" /> Nuova revisione
            </Button>
          )}
          {props.onDelete && (
            <Button size="sm" variant="ghost" className="text-status-red" onClick={() => { setForceArchive(props.canArchive === true && props.canDelete === false); setShowDelete(true); }} disabled={isPending}>
              <Trash2 className="mr-1 h-3 w-3" /> {props.canDelete === false && props.canArchive ? "Archivia" : "Elimina"}
            </Button>
          )}
        </>
      )}
      {props.isEditing && (
        <>
          <Button size="sm" onClick={handleSave} disabled={isPending}>
            {isPending ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Save className="mr-1 h-3 w-3" />}
            Salva
          </Button>
          <Button size="sm" variant="ghost" onClick={props.onCancel} disabled={isPending}>
            <X className="mr-1 h-3 w-3" /> Annulla
          </Button>
        </>
      )}

      <ChangeReasonDialog
        open={showReason}
        onCancel={() => setShowReason(false)}
        onConfirm={runSave}
        required={props.reasonRequired ?? true}
      />
      <ChangeReasonDialog
        open={showRevisionReason}
        onCancel={() => setShowRevisionReason(false)}
        onConfirm={runNewRevision}
        title="Nuova revisione"
        required
      />
      {props.onDelete && (
        <DeleteConfirmDialog
          open={showDelete}
          onCancel={() => setShowDelete(false)}
          onConfirm={runDelete}
          entityLabel={props.entityLabel}
          forceArchive={forceArchive}
        />
      )}
    </div>
  );
}
