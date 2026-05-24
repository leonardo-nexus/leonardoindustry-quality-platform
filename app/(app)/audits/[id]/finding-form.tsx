"use client";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createFindingAction } from "../actions";

export function FindingForm({ auditId }: { auditId: string }) {
  const [isPending, startTransition] = useTransition();
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    startTransition(async () => {
      const r = await createFindingAction(fd);
      if (r?.error) toast.error(r.error);
      else {
        toast.success("Rilievo registrato");
        form.reset();
      }
    });
  }
  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input type="hidden" name="audit_id" value={auditId} />
      <div className="space-y-2">
        <Label htmlFor="finding_type">Tipo</Label>
        <Select name="finding_type" defaultValue="osservazione">
          <SelectTrigger id="finding_type"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="osservazione">Osservazione</SelectItem>
            <SelectItem value="raccomandazione">Raccomandazione</SelectItem>
            <SelectItem value="non_conformita_minore">NC minore</SelectItem>
            <SelectItem value="non_conformita_maggiore">NC maggiore</SelectItem>
            <SelectItem value="punto_forte">Punto di forza</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Descrizione</Label>
        <Textarea id="description" name="description" required />
      </div>
      <p className="text-xs text-muted-foreground">
        Le NC vengono aperte automaticamente in &quot;Non conformità&quot;.
      </p>
      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "..." : "Registra rilievo"}
      </Button>
    </form>
  );
}
