"use client";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { linkProcessRequirementAction } from "../actions";

export function LinkRequirementForm({
  processId,
  requirements,
}: {
  processId: string;
  requirements: Array<{ id: string; clause: string; title: string; standard: any }>;
}) {
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    startTransition(async () => {
      const r = await linkProcessRequirementAction(fd);
      if (r?.error) toast.error(r.error);
      else {
        toast.success("Requisito collegato");
        form.reset();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input type="hidden" name="process_id" value={processId} />
      <div className="space-y-2">
        <Label htmlFor="requirement_id">Requisito</Label>
        <Select name="requirement_id">
          <SelectTrigger id="requirement_id"><SelectValue placeholder="Scegli..." /></SelectTrigger>
          <SelectContent>
            {requirements.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.standard?.code} § {r.clause} — {r.title.slice(0, 40)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="applicability">Applicabilità</Label>
        <Select name="applicability" defaultValue="applicabile">
          <SelectTrigger id="applicability"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="applicabile">Applicabile</SelectItem>
            <SelectItem value="parziale">Parziale</SelectItem>
            <SelectItem value="non_applicabile">Non applicabile</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Note</Label>
        <Textarea id="notes" name="notes" />
      </div>
      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "..." : "Collega"}
      </Button>
    </form>
  );
}
