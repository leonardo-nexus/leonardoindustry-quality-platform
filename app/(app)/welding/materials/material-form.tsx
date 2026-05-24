"use client";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createMaterialAction } from "../actions";

export function MaterialForm({
  companies,
  projects,
}: {
  companies: Array<{ id: string; name: string }>;
  projects: Array<{ id: string; code: string; name: string }>;
}) {
  const [isPending, startTransition] = useTransition();
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    startTransition(async () => {
      const r = await createMaterialAction(fd);
      if (r?.error) toast.error(r.error);
      else { toast.success("Lotto registrato"); form.reset(); }
    });
  }
  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="company_id">Impresa *</Label>
        <Select name="company_id">
          <SelectTrigger id="company_id"><SelectValue placeholder="Scegli..." /></SelectTrigger>
          <SelectContent>
            {companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="project_id">Commessa</Label>
        <Select name="project_id">
          <SelectTrigger id="project_id"><SelectValue placeholder="—" /></SelectTrigger>
          <SelectContent>
            {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.code} - {p.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="heat_number">N° colata</Label>
        <Input id="heat_number" name="heat_number" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="material_grade">Qualità materiale *</Label>
        <Input id="material_grade" name="material_grade" required placeholder="S355J2+N" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="thickness_mm">Spessore (mm)</Label>
        <Input id="thickness_mm" name="thickness_mm" type="number" step="0.1" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="status">Stato</Label>
        <Select name="status" defaultValue="disponibile">
          <SelectTrigger id="status"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="disponibile">Disponibile</SelectItem>
            <SelectItem value="usato">Usato</SelectItem>
            <SelectItem value="bloccato">Bloccato</SelectItem>
            <SelectItem value="non_conforme">Non conforme</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "..." : "Registra"}
      </Button>
    </form>
  );
}
