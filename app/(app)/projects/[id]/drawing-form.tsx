"use client";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createDrawingAction } from "../actions";

export function DrawingForm({ projectId }: { projectId: string }) {
  const [isPending, startTransition] = useTransition();
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    startTransition(async () => {
      const r = await createDrawingAction(fd);
      if (r?.error) toast.error(r.error);
      else {
        toast.success("Disegno aggiunto");
        form.reset();
      }
    });
  }
  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input type="hidden" name="project_id" value={projectId} />
      <div className="space-y-2">
        <Label htmlFor="code">Codice</Label>
        <Input id="code" name="code" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="revision">Revisione</Label>
        <Input id="revision" name="revision" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="title">Titolo</Label>
        <Input id="title" name="title" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="status">Stato</Label>
        <Select name="status" defaultValue="bozza">
          <SelectTrigger id="status"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="bozza">Bozza</SelectItem>
            <SelectItem value="in_revisione">In revisione</SelectItem>
            <SelectItem value="attivo">Attivo (approvato)</SelectItem>
            <SelectItem value="sospeso">Sospeso</SelectItem>
            <SelectItem value="obsoleto">Obsoleto</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "..." : "Aggiungi disegno"}
      </Button>
    </form>
  );
}
