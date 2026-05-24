"use client";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createWpsAction } from "../actions";

export function WpsForm({
  companies,
  processes,
}: {
  companies: Array<{ id: string; name: string }>;
  processes: Array<{ id: string; code: string; name: string }>;
}) {
  const [isPending, startTransition] = useTransition();
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const r = await createWpsAction(fd);
      if (r?.error) toast.error(r.error);
    });
  }
  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="code">Codice *</Label>
        <Input id="code" name="code" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="revision">Revisione *</Label>
        <Input id="revision" name="revision" required />
      </div>
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
        <Label htmlFor="welding_process_id">Processo *</Label>
        <Select name="welding_process_id">
          <SelectTrigger id="welding_process_id"><SelectValue placeholder="Scegli..." /></SelectTrigger>
          <SelectContent>
            {processes.map((p) => <SelectItem key={p.id} value={p.id}>{p.code} - {p.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="material_group">Gruppo materiale</Label>
        <Input id="material_group" name="material_group" placeholder="es. 1.1 / 8.1" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-2">
          <Label htmlFor="thickness_min_mm">Spessore min (mm)</Label>
          <Input id="thickness_min_mm" name="thickness_min_mm" type="number" step="0.1" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="thickness_max_mm">Spessore max (mm)</Label>
          <Input id="thickness_max_mm" name="thickness_max_mm" type="number" step="0.1" />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="position_range">Posizioni</Label>
        <Input id="position_range" name="position_range" placeholder="PA, PB, PC..." />
      </div>
      <div className="space-y-2">
        <Label htmlFor="status">Stato</Label>
        <Select name="status" defaultValue="bozza">
          <SelectTrigger id="status"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="bozza">Bozza</SelectItem>
            <SelectItem value="valida">Valida</SelectItem>
            <SelectItem value="sospesa">Sospesa</SelectItem>
            <SelectItem value="obsoleta">Obsoleta</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "..." : "Crea WPS"}
      </Button>
    </form>
  );
}
