"use client";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createWelderQualificationAction } from "../actions";

export function WelderForm({
  people,
  processes,
}: {
  people: Array<{ id: string; first_name: string; last_name: string }>;
  processes: Array<{ id: string; code: string; name: string }>;
}) {
  const [isPending, startTransition] = useTransition();
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    startTransition(async () => {
      const r = await createWelderQualificationAction(fd);
      if (r?.error) toast.error(r.error);
      else { toast.success("Qualifica registrata"); form.reset(); }
    });
  }
  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="person_id">Saldatore *</Label>
        <Select name="person_id">
          <SelectTrigger id="person_id"><SelectValue placeholder="Scegli..." /></SelectTrigger>
          <SelectContent>
            {people.map((p) => <SelectItem key={p.id} value={p.id}>{p.first_name} {p.last_name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="welding_process_id">Processo *</Label>
        <Select name="welding_process_id">
          <SelectTrigger id="welding_process_id"><SelectValue placeholder="Scegli..." /></SelectTrigger>
          <SelectContent>
            {processes.map((p) => <SelectItem key={p.id} value={p.id}>{p.code} - {p.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="certificate_code">Certificato *</Label>
        <Input id="certificate_code" name="certificate_code" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="material_group">Gruppo materiale</Label>
        <Input id="material_group" name="material_group" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="position_range">Posizioni</Label>
        <Input id="position_range" name="position_range" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="issue_date">Emissione</Label>
        <Input id="issue_date" name="issue_date" type="date" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="expiry_date">Scadenza *</Label>
        <Input id="expiry_date" name="expiry_date" type="date" required />
      </div>
      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "..." : "Registra"}
      </Button>
    </form>
  );
}
