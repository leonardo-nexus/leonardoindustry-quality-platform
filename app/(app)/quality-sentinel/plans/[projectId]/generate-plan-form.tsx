"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { generateQualityPlanAction } from "./actions";

export function GeneratePlanForm({ projectId, templates }: { projectId: string; templates: Array<{ id: string; code: string; name: string; kind: string; country: string; norms: string[] }> }) {
  const router = useRouter();
  const [templateId, setTemplateId] = useState("");
  const [isPending, startTransition] = useTransition();

  const selected = templates.find((t) => t.id === templateId);

  function handle() {
    if (!templateId) return toast.error("Seleziona un template");
    startTransition(async () => {
      const r = await generateQualityPlanAction(projectId, templateId);
      if (r?.error) {
        toast.error(r.error);
        return;
      }
      toast.success(`Piano qualità generato · ${r.phases} fasi · ${r.checklists} checklist`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Template qualità</Label>
        <Select value={templateId} onValueChange={setTemplateId}>
          <SelectTrigger><SelectValue placeholder="Scegli un template..." /></SelectTrigger>
          <SelectContent>
            {templates.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name} · {t.country} · {t.kind}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {selected && (
        <div className="rounded-md border border-brand-cyan/30 bg-brand-cyan/5 p-3 text-sm">
          <div className="font-medium">{selected.name}</div>
          <div className="text-xs text-leo-muted mt-1">Paese: {selected.country} · Tipo: {selected.kind}</div>
          {selected.norms?.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {selected.norms.map((n) => <Badge key={n} variant="blue" className="text-[10px]">{n}</Badge>)}
            </div>
          )}
        </div>
      )}
      <Button onClick={handle} disabled={isPending || !templateId} className="w-full">
        {isPending ? "Generazione..." : "Genera piano qualità"}
      </Button>
    </div>
  );
}
