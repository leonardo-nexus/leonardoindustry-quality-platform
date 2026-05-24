"use client";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createInspectionAction } from "../../actions";

export function InspectionForm({
  weldId,
  people,
}: {
  weldId: string;
  people: Array<{ id: string; first_name: string; last_name: string }>;
}) {
  const [isPending, startTransition] = useTransition();
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    startTransition(async () => {
      const r = await createInspectionAction(fd);
      if (r?.error) toast.error(r.error);
      else { toast.success("Controllo registrato"); form.reset(); }
    });
  }
  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input type="hidden" name="weld_id" value={weldId} />
      <div className="space-y-2">
        <Label htmlFor="inspection_type">Tipo controllo</Label>
        <Select name="inspection_type" defaultValue="VT">
          <SelectTrigger id="inspection_type"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="VT">VT (visivo)</SelectItem>
            <SelectItem value="PT">PT (liquidi penetranti)</SelectItem>
            <SelectItem value="MT">MT (magnetoscopico)</SelectItem>
            <SelectItem value="UT">UT (ultrasuoni)</SelectItem>
            <SelectItem value="RT">RT (radiografico)</SelectItem>
            <SelectItem value="dimensionale">Dimensionale</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="inspection_date">Data</Label>
        <Input id="inspection_date" name="inspection_date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="inspector_id">Ispettore</Label>
        <Select name="inspector_id">
          <SelectTrigger id="inspector_id"><SelectValue placeholder="—" /></SelectTrigger>
          <SelectContent>
            {people.map((p) => <SelectItem key={p.id} value={p.id}>{p.first_name} {p.last_name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="result">Esito *</Label>
        <Select name="result" defaultValue="conforme">
          <SelectTrigger id="result"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="conforme">Conforme</SelectItem>
            <SelectItem value="non_conforme">Non conforme (apre NC)</SelectItem>
            <SelectItem value="limitato">Limitato</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Note</Label>
        <Textarea id="notes" name="notes" />
      </div>
      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "..." : "Registra controllo"}
      </Button>
    </form>
  );
}
