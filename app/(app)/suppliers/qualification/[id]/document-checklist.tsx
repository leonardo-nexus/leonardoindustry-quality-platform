"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, ClipboardCheck, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  DOCUMENT_QUALIFICATION_REQUIREMENTS,
  computeDocumentQualificationScore,
} from "@/lib/quality/supplier-qualification-scoring";
import { updateDocumentQualificationChecklistAction } from "../actions";

type ChecklistDocument = {
  id: string;
  document_type: string;
  mandatory: boolean | null;
  uploaded: boolean | null;
  verified: boolean | null;
  expiry_date: string | null;
};

type ChecklistItem = ChecklistDocument & {
  label: string;
  area: string;
  points: number;
};

function mergeDocuments(documents: ChecklistDocument[]): ChecklistItem[] {
  return DOCUMENT_QUALIFICATION_REQUIREMENTS.map((requirement) => {
    const current = documents.find((document) => document.document_type === requirement.document_type);
    return {
      id: current?.id ?? `new:${requirement.document_type}`,
      document_type: requirement.document_type,
      label: requirement.label,
      area: requirement.area,
      points: requirement.points,
      mandatory: current?.mandatory ?? requirement.mandatory,
      uploaded: current?.uploaded ?? false,
      verified: current?.verified ?? false,
      expiry_date: current?.expiry_date ?? null,
    };
  });
}

export function DocumentQualificationChecklist({
  qualificationId,
  documents,
}: {
  qualificationId: string;
  documents: ChecklistDocument[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [items, setItems] = useState<ChecklistItem[]>(() => mergeDocuments(documents));
  const score = useMemo(() => computeDocumentQualificationScore(items), [items]);
  const checkedCount = items.filter((item) => item.uploaded && item.verified).length;

  function setChecked(id: string, checked: boolean) {
    setItems((current) =>
      current.map((item) => item.id === id ? { ...item, uploaded: checked, verified: checked } : item),
    );
  }

  function setExpiry(id: string, expiry_date: string) {
    setItems((current) =>
      current.map((item) => item.id === id ? { ...item, expiry_date: expiry_date || null } : item),
    );
  }

  function selectAll() {
    setItems((current) => current.map((item) => ({ ...item, uploaded: true, verified: true })));
  }

  function save() {
    startTransition(async () => {
      const result = await updateDocumentQualificationChecklistAction(
        qualificationId,
        items.map((item) => ({
          id: item.id,
          document_type: item.document_type,
          checked: !!item.uploaded && !!item.verified,
          expiry_date: item.expiry_date,
        })),
      );
      if (!("score" in result)) {
        toast.error(result.error);
      } else {
        toast.success(`Qualifiche documentali salvate - score ${result.score}/100`);
        router.refresh();
      }
    });
  }

  return (
    <Card className="leo-card border-brand-cyan/30">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-3 text-base">
          <span className="flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-brand-cyan" />
            Inserisci qualifiche documentali
          </span>
          <span className="rounded-md border border-brand-cyan/40 bg-brand-cyan/10 px-3 py-1 text-sm text-brand-cyan">
            {score}/100
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <div className="h-2 overflow-hidden rounded-full bg-leo-card2">
              <div className="h-full rounded-full bg-brand-cyan" style={{ width: `${score}%` }} />
            </div>
            <p className="mt-2 text-xs text-leo-muted">
              {checkedCount}/{items.length} requisiti documentali confermati. Ogni spunta assegna i punti indicati e ricalcola il punteggio complessivo da 0 a 100.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={selectAll} disabled={pending}>
              <CheckCircle2 className="h-4 w-4" />
              Spunta tutto
            </Button>
            <Button type="button" size="sm" onClick={save} disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salva checklist
            </Button>
          </div>
        </div>

        <div className="overflow-auto">
          <table className="min-w-[820px] w-full text-xs">
            <thead className="text-leo-muted">
              <tr className="border-b border-leo-border">
                <th className="py-2 text-left">Check</th>
                <th className="py-2 text-left">Area</th>
                <th className="py-2 text-left">Qualifica documentale</th>
                <th className="py-2 text-center">Obbl.</th>
                <th className="py-2 text-right">Punti</th>
                <th className="py-2 text-left">Scadenza</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const checked = !!item.uploaded && !!item.verified;
                return (
                  <tr key={item.document_type} className="border-b border-leo-border/60">
                    <td className="py-2 pr-3">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) => setChecked(item.id, event.target.checked)}
                        className="h-4 w-4 rounded border-leo-border accent-brand-cyan"
                      />
                    </td>
                    <td className="py-2 pr-3 text-leo-muted">{item.area}</td>
                    <td className="py-2 pr-3 font-medium">{item.label}</td>
                    <td className="py-2 text-center">{item.mandatory ? "Si" : "No"}</td>
                    <td className="py-2 text-right font-mono font-bold text-brand-cyan">{checked ? item.points : 0}/{item.points}</td>
                    <td className="py-2 pl-3">
                      <Input
                        type="date"
                        value={item.expiry_date ?? ""}
                        onChange={(event) => setExpiry(item.id, event.target.value)}
                        className="h-8"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
