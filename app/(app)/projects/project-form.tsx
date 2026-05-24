"use client";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createProjectAction } from "./actions";

export function ProjectForm({
  companies,
  execClasses,
  people,
}: {
  companies: Array<{ id: string; name: string }>;
  execClasses: Array<{ id: string; code: string }>;
  people: Array<{ id: string; first_name: string; last_name: string }>;
}) {
  const [isPending, startTransition] = useTransition();
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const r = await createProjectAction(fd);
      if (r?.error) toast.error(r.error);
    });
  }
  return (
    <form onSubmit={handleSubmit} className="grid max-w-3xl grid-cols-1 gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="code">Codice *</Label>
        <Input id="code" name="code" required placeholder="C-2026-001" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="name">Nome *</Label>
        <Input id="name" name="name" required />
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
        <Label htmlFor="customer_name">Cliente</Label>
        <Input id="customer_name" name="customer_name" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="execution_class_id">Classe EXC (UNE-EN 1090)</Label>
        <Select name="execution_class_id">
          <SelectTrigger id="execution_class_id"><SelectValue placeholder="—" /></SelectTrigger>
          <SelectContent>
            {execClasses.map((e) => <SelectItem key={e.id} value={e.id}>{e.code}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="project_manager_id">Project Manager</Label>
        <Select name="project_manager_id">
          <SelectTrigger id="project_manager_id"><SelectValue placeholder="Scegli..." /></SelectTrigger>
          <SelectContent>
            {people.map((p) => <SelectItem key={p.id} value={p.id}>{p.first_name} {p.last_name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="start_date">Inizio</Label>
        <Input id="start_date" name="start_date" type="date" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="end_date">Fine prevista</Label>
        <Input id="end_date" name="end_date" type="date" />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="notes">Note</Label>
        <Textarea id="notes" name="notes" />
      </div>
      <div className="md:col-span-2">
        <Button type="submit" disabled={isPending}>{isPending ? "..." : "Crea commessa"}</Button>
      </div>
    </form>
  );
}
