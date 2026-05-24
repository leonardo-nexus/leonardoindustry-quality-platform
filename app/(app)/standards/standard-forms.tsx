"use client";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createStandardAction, createRequirementAction } from "./actions";

export function StandardForm() {
  const [isPending, startTransition] = useTransition();
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    startTransition(async () => {
      const r = await createStandardAction(fd);
      if (r?.error) toast.error(r.error);
      else {
        toast.success("Norma creata");
        form.reset();
      }
    });
  }
  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="space-y-1">
        <Label htmlFor="code">Codice</Label>
        <Input id="code" name="code" required placeholder="ISO 9001" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="version">Versione</Label>
        <Input id="version" name="version" placeholder="2015" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="title">Titolo</Label>
        <Input id="title" name="title" required />
      </div>
      <Button type="submit" disabled={isPending} className="w-full" size="sm">
        {isPending ? "..." : "Crea"}
      </Button>
    </form>
  );
}

export function RequirementForm({ standards }: { standards: Array<{ id: string; code: string; version?: string | null }> }) {
  const [isPending, startTransition] = useTransition();
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    startTransition(async () => {
      const r = await createRequirementAction(fd);
      if (r?.error) toast.error(r.error);
      else {
        toast.success("Requisito creato");
        form.reset();
      }
    });
  }
  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="space-y-1">
        <Label htmlFor="standard_id">Norma</Label>
        <Select name="standard_id">
          <SelectTrigger id="standard_id"><SelectValue placeholder="Scegli..." /></SelectTrigger>
          <SelectContent>
            {standards.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.code} {s.version ?? ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="clause">Clausola</Label>
        <Input id="clause" name="clause" required placeholder="4.1" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="title">Titolo</Label>
        <Input id="title" name="title" required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="requirement_summary">Sintesi</Label>
        <Textarea id="requirement_summary" name="requirement_summary" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="evidence_expected">Evidenza attesa</Label>
        <Textarea id="evidence_expected" name="evidence_expected" />
      </div>
      <Button type="submit" disabled={isPending} className="w-full" size="sm">
        {isPending ? "..." : "Crea"}
      </Button>
    </form>
  );
}
