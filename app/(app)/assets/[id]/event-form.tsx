"use client";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createAssetEventAction } from "../actions";

export function AssetEventForm({ assetId }: { assetId: string }) {
  const [isPending, startTransition] = useTransition();
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    startTransition(async () => {
      const r = await createAssetEventAction(fd);
      if (r?.error) toast.error(r.error);
      else {
        toast.success("Evento registrato");
        form.reset();
      }
    });
  }
  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input type="hidden" name="asset_id" value={assetId} />
      <div className="space-y-2">
        <Label htmlFor="event_type">Tipo</Label>
        <Select name="event_type" defaultValue="taratura">
          <SelectTrigger id="event_type"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="taratura">Taratura</SelectItem>
            <SelectItem value="verifica">Verifica</SelectItem>
            <SelectItem value="manutenzione">Manutenzione</SelectItem>
            <SelectItem value="revisione">Revisione</SelectItem>
            <SelectItem value="riparazione">Riparazione</SelectItem>
            <SelectItem value="fuori_servizio">Fuori servizio</SelectItem>
            <SelectItem value="rientro_servizio">Rientro in servizio</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="event_date">Data</Label>
        <Input id="event_date" name="event_date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="next_due_date">Prossima scadenza</Label>
        <Input id="next_due_date" name="next_due_date" type="date" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="performed_by">Eseguita da</Label>
        <Input id="performed_by" name="performed_by" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="result">Esito</Label>
        <Select name="result">
          <SelectTrigger id="result"><SelectValue placeholder="—" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="conforme">Conforme</SelectItem>
            <SelectItem value="non_conforme">Non conforme</SelectItem>
            <SelectItem value="limitato">Limitato</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Note</Label>
        <Textarea id="notes" name="notes" />
      </div>
      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "..." : "Registra"}
      </Button>
    </form>
  );
}
