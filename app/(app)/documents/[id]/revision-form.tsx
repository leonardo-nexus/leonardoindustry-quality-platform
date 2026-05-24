"use client";
import { useRef, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uploadDocumentRevisionAction } from "../actions";

export function RevisionForm({ documentId }: { documentId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const r = await uploadDocumentRevisionAction(fd);
      if (r?.error) toast.error(r.error);
      else {
        toast.success("Revisione caricata");
        formRef.current?.reset();
      }
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-3">
      <input type="hidden" name="document_id" value={documentId} />
      <div className="space-y-2">
        <Label htmlFor="revision">Codice revisione *</Label>
        <Input id="revision" name="revision" required placeholder="00 / 01 / A / 2026-01" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="issue_date">Data emissione</Label>
        <Input id="issue_date" name="issue_date" type="date" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="next_review_date">Prossima revisione</Label>
        <Input id="next_review_date" name="next_review_date" type="date" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="file">File</Label>
        <Input id="file" name="file" type="file" />
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" id="is_current" name="is_current" value="true" defaultChecked />
        <Label htmlFor="is_current">Imposta come corrente</Label>
      </div>
      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Caricamento..." : "Carica revisione"}
      </Button>
    </form>
  );
}
