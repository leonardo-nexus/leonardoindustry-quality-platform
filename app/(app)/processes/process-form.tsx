"use client";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createProcessAction } from "./actions";

export function ProcessForm() {
  const [isPending, startTransition] = useTransition();
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    startTransition(async () => {
      const r = await createProcessAction(fd);
      if (r?.error) toast.error(r.error);
      else {
        toast.success("Processo creato");
        form.reset();
      }
    });
  }
  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="code">Codice</Label>
        <Input id="code" name="code" required placeholder="PROC-XXX-01" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="name">Nome</Label>
        <Input id="name" name="name" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="category">Categoria</Label>
        <Select name="category" defaultValue="qualita">
          <SelectTrigger id="category"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="qualita">Qualità</SelectItem>
            <SelectItem value="sicurezza">Sicurezza</SelectItem>
            <SelectItem value="ambiente">Ambiente</SelectItem>
            <SelectItem value="operativo">Operativo</SelectItem>
            <SelectItem value="saldatura">Saldatura</SelectItem>
            <SelectItem value="direzione">Direzione</SelectItem>
            <SelectItem value="fornitori">Fornitori</SelectItem>
            <SelectItem value="hr">HR</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Descrizione</Label>
        <Textarea id="description" name="description" />
      </div>
      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Salvataggio..." : "Crea processo"}
      </Button>
    </form>
  );
}
