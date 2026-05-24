"use client";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createDocumentAction } from "./actions";

export function DocumentForm({
  companies,
  processes,
}: {
  companies: Array<{ id: string; name: string }>;
  processes: Array<{ id: string; code: string; name: string }>;
}) {
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const r = await createDocumentAction(fd);
      if (r?.error) toast.error(r.error);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="grid max-w-3xl grid-cols-1 gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="code">Codice *</Label>
        <Input id="code" name="code" required placeholder="P-01" />
      </div>
      <div className="space-y-2 md:col-span-1">
        <Label htmlFor="title">Titolo *</Label>
        <Input id="title" name="title" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="type">Tipo *</Label>
        <Select name="type" defaultValue="procedura">
          <SelectTrigger id="type"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="procedura">Procedura</SelectItem>
            <SelectItem value="istruzione">Istruzione operativa</SelectItem>
            <SelectItem value="modulo">Modulo</SelectItem>
            <SelectItem value="registro">Registro</SelectItem>
            <SelectItem value="certificato">Certificato</SelectItem>
            <SelectItem value="disegno">Disegno</SelectItem>
            <SelectItem value="wps">WPS</SelectItem>
            <SelectItem value="wpqr">WPQR</SelectItem>
            <SelectItem value="rapporto_controllo">Rapporto controllo</SelectItem>
            <SelectItem value="dossier">Dossier</SelectItem>
            <SelectItem value="documento_esterno">Documento esterno</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="status">Stato</Label>
        <Select name="status" defaultValue="bozza">
          <SelectTrigger id="status"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="bozza">Bozza</SelectItem>
            <SelectItem value="in_revisione">In revisione</SelectItem>
            <SelectItem value="attivo">Attivo</SelectItem>
            <SelectItem value="sospeso">Sospeso</SelectItem>
            <SelectItem value="obsoleto">Obsoleto</SelectItem>
            <SelectItem value="archiviato">Archiviato</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="company_id">Impresa</Label>
        <Select name="company_id">
          <SelectTrigger id="company_id"><SelectValue placeholder="Documento di gruppo se vuoto" /></SelectTrigger>
          <SelectContent>
            {companies.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="process_id">Processo</Label>
        <Select name="process_id">
          <SelectTrigger id="process_id"><SelectValue placeholder="Scegli..." /></SelectTrigger>
          <SelectContent>
            {processes.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.code} — {p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="review_frequency_months">Frequenza revisione (mesi)</Label>
        <Input id="review_frequency_months" name="review_frequency_months" type="number" min="1" />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="notes">Note</Label>
        <Textarea id="notes" name="notes" />
      </div>
      <div className="md:col-span-2">
        <Button type="submit" disabled={isPending}>{isPending ? "Salvataggio..." : "Crea documento"}</Button>
      </div>
    </form>
  );
}
