"use client";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createWpqrAction } from "../actions";

export function WpqrForm({ wpsList }: { wpsList: Array<{ id: string; code: string; revision: string }> }) {
  const [isPending, startTransition] = useTransition();
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    startTransition(async () => {
      const r = await createWpqrAction(fd);
      if (r?.error) toast.error(r.error);
      else { toast.success("WPQR creata"); form.reset(); }
    });
  }
  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="wps_id">WPS collegata *</Label>
        <Select name="wps_id">
          <SelectTrigger id="wps_id"><SelectValue placeholder="Scegli..." /></SelectTrigger>
          <SelectContent>
            {wpsList.map((w) => <SelectItem key={w.id} value={w.id}>{w.code} r{w.revision}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="certificate_code">Codice certificato *</Label>
        <Input id="certificate_code" name="certificate_code" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="issue_date">Emissione</Label>
        <Input id="issue_date" name="issue_date" type="date" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="expiry_date">Scadenza</Label>
        <Input id="expiry_date" name="expiry_date" type="date" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="status">Stato</Label>
        <Select name="status" defaultValue="valida">
          <SelectTrigger id="status"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="valida">Valida</SelectItem>
            <SelectItem value="scaduta">Scaduta</SelectItem>
            <SelectItem value="sospesa">Sospesa</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "..." : "Crea"}
      </Button>
    </form>
  );
}
