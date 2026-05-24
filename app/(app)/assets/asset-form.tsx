"use client";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createAssetAction } from "./actions";

export function AssetForm({ companies }: { companies: Array<{ id: string; name: string }> }) {
  const [isPending, startTransition] = useTransition();
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const r = await createAssetAction(fd);
      if (r?.error) toast.error(r.error);
    });
  }
  return (
    <form onSubmit={handleSubmit} className="grid max-w-3xl grid-cols-1 gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="code">Codice interno *</Label>
        <Input id="code" name="code" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="serial_number">Matricola / Serial number</Label>
        <Input id="serial_number" name="serial_number" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="asset_type">Tipo *</Label>
        <Select name="asset_type" defaultValue="strumento_misura">
          <SelectTrigger id="asset_type"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="strumento_misura">Strumento di misura</SelectItem>
            <SelectItem value="saldatrice">Saldatrice</SelectItem>
            <SelectItem value="attrezzatura">Attrezzatura</SelectItem>
            <SelectItem value="veicolo">Veicolo</SelectItem>
            <SelectItem value="estintore">Estintore</SelectItem>
            <SelectItem value="dpi">DPI</SelectItem>
            <SelectItem value="macchina_officina">Macchina officina</SelectItem>
            <SelectItem value="altro">Altro</SelectItem>
          </SelectContent>
        </Select>
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
        <Label htmlFor="manufacturer">Marca</Label>
        <Input id="manufacturer" name="manufacturer" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="model">Modello</Label>
        <Input id="model" name="model" />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="description">Descrizione</Label>
        <Textarea id="description" name="description" />
      </div>
      <div className="md:col-span-2">
        <Button type="submit" disabled={isPending}>{isPending ? "..." : "Crea asset"}</Button>
      </div>
    </form>
  );
}
