"use client";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createSiteAction } from "../actions";

export function SiteForm({ companyId }: { companyId: string }) {
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    startTransition(async () => {
      const r = await createSiteAction(fd);
      if (r?.error) toast.error(r.error);
      else {
        toast.success("Sede creata");
        form.reset();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 border-b pb-4">
      <input type="hidden" name="company_id" value={companyId} />
      <div className="space-y-2">
        <Label htmlFor="site_type">Tipo</Label>
        <Select name="type" defaultValue="sede">
          <SelectTrigger id="site_type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sede">Sede</SelectItem>
            <SelectItem value="officina">Officina</SelectItem>
            <SelectItem value="cantiere">Cantiere</SelectItem>
            <SelectItem value="magazzino">Magazzino</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="site_name">Nome</Label>
        <Input id="site_name" name="name" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="site_address">Indirizzo</Label>
        <Input id="site_address" name="address" />
      </div>
      <Button type="submit" size="sm" disabled={isPending}>
        {isPending ? "Salvataggio..." : "Aggiungi sede"}
      </Button>
    </form>
  );
}
