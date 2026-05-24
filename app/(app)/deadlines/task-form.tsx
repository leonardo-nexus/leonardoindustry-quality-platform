"use client";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createTaskAction } from "./actions";

interface Person {
  id: string;
  first_name: string;
  last_name: string;
  company_id: string;
}

export function TaskForm({
  companies,
  people,
  processes,
}: {
  companies: Array<{ id: string; name: string }>;
  people: Person[];
  processes: Array<{ id: string; code: string; name: string }>;
}) {
  const [isPending, startTransition] = useTransition();
  const [companyId, setCompanyId] = useState(companies[0]?.id ?? "");
  const filteredPeople = useMemo(
    () => people.filter((p) => !companyId || p.company_id === companyId),
    [people, companyId],
  );

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const r = await createTaskAction(fd);
      if (r?.error) toast.error(r.error);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="grid max-w-3xl grid-cols-1 gap-4 md:grid-cols-2">
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="title">Titolo *</Label>
        <Input id="title" name="title" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="company_id">Impresa *</Label>
        <Select name="company_id" value={companyId} onValueChange={setCompanyId}>
          <SelectTrigger id="company_id"><SelectValue /></SelectTrigger>
          <SelectContent>
            {companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="source_type">Origine *</Label>
        <Select name="source_type" defaultValue="documento">
          <SelectTrigger id="source_type"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="documento">Documento</SelectItem>
            <SelectItem value="audit">Audit</SelectItem>
            <SelectItem value="non_conformita">Non conformità</SelectItem>
            <SelectItem value="azione_correttiva">Azione correttiva</SelectItem>
            <SelectItem value="formazione">Formazione</SelectItem>
            <SelectItem value="visita_medica">Visita medica</SelectItem>
            <SelectItem value="fornitore">Fornitore</SelectItem>
            <SelectItem value="strumento">Strumento / taratura</SelectItem>
            <SelectItem value="veicolo">Veicolo</SelectItem>
            <SelectItem value="saldatura">Saldatura</SelectItem>
            <SelectItem value="wps">WPS</SelectItem>
            <SelectItem value="wpqr">WPQR</SelectItem>
            <SelectItem value="qualifica_saldatore">Qualifica saldatore</SelectItem>
            <SelectItem value="cantiere">Cantiere</SelectItem>
            <SelectItem value="ambiente">Ambiente</SelectItem>
            <SelectItem value="sicurezza">Sicurezza</SelectItem>
            <SelectItem value="altro">Altro</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="process_id">Processo</Label>
        <Select name="process_id">
          <SelectTrigger id="process_id"><SelectValue placeholder="Scegli..." /></SelectTrigger>
          <SelectContent>
            {processes.map((p) => <SelectItem key={p.id} value={p.id}>{p.code} — {p.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="responsible_id">Responsabile *</Label>
        <Select name="responsible_id">
          <SelectTrigger id="responsible_id"><SelectValue placeholder="Scegli..." /></SelectTrigger>
          <SelectContent>
            {filteredPeople.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.first_name} {p.last_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="due_date">Scadenza *</Label>
        <Input id="due_date" name="due_date" type="date" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="priority">Priorità</Label>
        <Select name="priority" defaultValue="media">
          <SelectTrigger id="priority"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="bassa">Bassa</SelectItem>
            <SelectItem value="media">Media</SelectItem>
            <SelectItem value="alta">Alta</SelectItem>
            <SelectItem value="critica">Critica</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-end space-x-2">
        <input type="checkbox" id="blocks_operations" name="blocks_operations" value="true" />
        <Label htmlFor="blocks_operations">Blocca operatività se scade</Label>
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="description">Descrizione</Label>
        <Textarea id="description" name="description" />
      </div>
      <div className="md:col-span-2">
        <Button type="submit" disabled={isPending}>{isPending ? "Salvataggio..." : "Crea task"}</Button>
      </div>
    </form>
  );
}
