"use client";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createAuditAction } from "./actions";

export function AuditForm({
  companies,
  standards,
  processes,
  people,
}: {
  companies: Array<{ id: string; name: string }>;
  standards: Array<{ id: string; code: string }>;
  processes: Array<{ id: string; code: string; name: string }>;
  people: Array<{ id: string; first_name: string; last_name: string }>;
}) {
  const [isPending, startTransition] = useTransition();
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const r = await createAuditAction(fd);
      if (r?.error) toast.error(r.error);
    });
  }
  return (
    <form onSubmit={handleSubmit} className="grid max-w-3xl grid-cols-1 gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="code">Codice</Label>
        <Input id="code" name="code" placeholder="AUDIT-2026-01" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="audit_type">Tipo *</Label>
        <Select name="audit_type" defaultValue="interno">
          <SelectTrigger id="audit_type"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="interno">Interno</SelectItem>
            <SelectItem value="esterno">Esterno</SelectItem>
            <SelectItem value="cliente">Cliente</SelectItem>
            <SelectItem value="fornitore">Fornitore</SelectItem>
            <SelectItem value="fpc">FPC (UNE-EN 1090)</SelectItem>
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
        <Label htmlFor="standard_id">Norma</Label>
        <Select name="standard_id">
          <SelectTrigger id="standard_id"><SelectValue placeholder="Scegli..." /></SelectTrigger>
          <SelectContent>
            {standards.map((s) => <SelectItem key={s.id} value={s.id}>{s.code}</SelectItem>)}
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
        <Label htmlFor="lead_auditor_id">Lead auditor</Label>
        <Select name="lead_auditor_id">
          <SelectTrigger id="lead_auditor_id"><SelectValue placeholder="Scegli..." /></SelectTrigger>
          <SelectContent>
            {people.map((p) => <SelectItem key={p.id} value={p.id}>{p.first_name} {p.last_name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="planned_date">Data prevista *</Label>
        <Input id="planned_date" name="planned_date" type="date" required />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="scope">Ambito</Label>
        <Textarea id="scope" name="scope" />
      </div>
      <div className="md:col-span-2">
        <Button type="submit" disabled={isPending}>{isPending ? "Salvataggio..." : "Crea audit"}</Button>
      </div>
    </form>
  );
}
