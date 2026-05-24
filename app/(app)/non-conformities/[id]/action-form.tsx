"use client";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createCorrectiveActionAction } from "@/app/(app)/actions/actions";

export function ActionForm({
  ncId,
  companyId,
  people,
}: {
  ncId: string;
  companyId: string;
  people: Array<{ id: string; first_name: string; last_name: string }>;
}) {
  const [isPending, startTransition] = useTransition();
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    startTransition(async () => {
      const r = await createCorrectiveActionAction(fd);
      if (r?.error) toast.error(r.error);
      else {
        toast.success("Azione aperta");
        form.reset();
      }
    });
  }
  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input type="hidden" name="non_conformity_id" value={ncId} />
      <input type="hidden" name="company_id" value={companyId} />
      <div className="space-y-2">
        <Label htmlFor="title">Titolo</Label>
        <Input id="title" name="title" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="root_cause">Causa</Label>
        <Textarea id="root_cause" name="root_cause" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="action_plan">Piano d&apos;azione *</Label>
        <Textarea id="action_plan" name="action_plan" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="responsible_id">Responsabile *</Label>
        <Select name="responsible_id">
          <SelectTrigger id="responsible_id"><SelectValue placeholder="Scegli..." /></SelectTrigger>
          <SelectContent>
            {people.map((p) => <SelectItem key={p.id} value={p.id}>{p.first_name} {p.last_name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="due_date">Scadenza *</Label>
        <Input id="due_date" name="due_date" type="date" required />
      </div>
      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "..." : "Apri azione"}
      </Button>
    </form>
  );
}
