"use client";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addPersonCompetenceAction } from "../actions";

export function CompetenceLinkForm({
  personId,
  competences,
}: {
  personId: string;
  competences: Array<{ id: string; name: string; category: string; requires_expiry: boolean }>;
}) {
  const [isPending, startTransition] = useTransition();
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    startTransition(async () => {
      const r = await addPersonCompetenceAction(fd);
      if (r?.error) toast.error(r.error);
      else {
        toast.success("Competenza aggiunta");
        form.reset();
      }
    });
  }
  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input type="hidden" name="person_id" value={personId} />
      <div className="space-y-2">
        <Label htmlFor="competence_id">Competenza</Label>
        <Select name="competence_id">
          <SelectTrigger id="competence_id"><SelectValue placeholder="Scegli..." /></SelectTrigger>
          <SelectContent>
            {competences.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="issue_date">Emissione</Label>
        <Input id="issue_date" name="issue_date" type="date" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="expiry_date">Scadenza</Label>
        <Input id="expiry_date" name="expiry_date" type="date" />
      </div>
      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "..." : "Aggiungi"}
      </Button>
    </form>
  );
}
