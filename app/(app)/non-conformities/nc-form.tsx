"use client";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createNcAction } from "./actions";

export function NcForm({
  companies,
  processes,
  people,
}: {
  companies: Array<{ id: string; name: string }>;
  processes: Array<{ id: string; code: string; name: string }>;
  people: Array<{ id: string; first_name: string; last_name: string }>;
}) {
  const [isPending, startTransition] = useTransition();
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const r = await createNcAction(fd);
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
        <Select name="company_id">
          <SelectTrigger id="company_id"><SelectValue placeholder="Scegli..." /></SelectTrigger>
          <SelectContent>
            {companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="severity">Gravità *</Label>
        <Select name="severity" defaultValue="minore">
          <SelectTrigger id="severity"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="minore">Minore</SelectItem>
            <SelectItem value="maggiore">Maggiore</SelectItem>
            <SelectItem value="critica">Critica</SelectItem>
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
        <Label htmlFor="responsible_id">Responsabile</Label>
        <Select name="responsible_id">
          <SelectTrigger id="responsible_id"><SelectValue placeholder="Scegli..." /></SelectTrigger>
          <SelectContent>
            {people.map((p) => <SelectItem key={p.id} value={p.id}>{p.first_name} {p.last_name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="detected_at">Data rilievo</Label>
        <Input id="detected_at" name="detected_at" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="code">Codice</Label>
        <Input id="code" name="code" placeholder="NC-2026-001" />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="description">Descrizione *</Label>
        <Textarea id="description" name="description" required rows={4} />
      </div>
      <div className="md:col-span-2">
        <Button type="submit" disabled={isPending}>{isPending ? "Salvataggio..." : "Apri NC"}</Button>
      </div>
    </form>
  );
}
