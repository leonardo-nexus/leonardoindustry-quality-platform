"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { submitFormAction, saveDraftAction } from "./actions";

interface SchemaField {
  key: string;
  label: string;
  type: "text" | "textarea" | "date" | "number" | "select" | "checkbox";
  required?: boolean;
  options?: string[];
}

export function FormCompilation({
  templateId,
  templateCode,
  templateTitle,
  schema,
}: {
  templateId: string;
  templateCode: string;
  templateTitle: string;
  schema: { fields: SchemaField[] };
}) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, any>>({});
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();

  function setVal(key: string, v: any) {
    setValues((s) => ({ ...s, [key]: v }));
  }

  function renderField(f: SchemaField) {
    const v = values[f.key] ?? "";
    if (f.type === "textarea") {
      return <Textarea value={v} onChange={(e) => setVal(f.key, e.target.value)} required={f.required} rows={3} />;
    }
    if (f.type === "date") {
      return <Input type="date" value={v} onChange={(e) => setVal(f.key, e.target.value)} required={f.required} />;
    }
    if (f.type === "number") {
      return <Input type="number" value={v} onChange={(e) => setVal(f.key, e.target.value)} required={f.required} />;
    }
    if (f.type === "select" && f.options) {
      return (
        <Select value={v} onValueChange={(x) => setVal(f.key, x)}>
          <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
          <SelectContent>
            {f.options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
          </SelectContent>
        </Select>
      );
    }
    if (f.type === "checkbox") {
      return <input type="checkbox" checked={!!v} onChange={(e) => setVal(f.key, e.target.checked)} className="h-4 w-4" />;
    }
    return <Input type="text" value={v} onChange={(e) => setVal(f.key, e.target.value)} required={f.required} />;
  }

  function handle(action: "draft" | "submit") {
    // Validation client: required
    const missing = (schema?.fields ?? []).filter((f) => f.required && !values[f.key]);
    if (action === "submit" && missing.length > 0) {
      toast.error(`Campi obbligatori mancanti: ${missing.map((m) => m.label).join(", ")}`);
      return;
    }
    startTransition(async () => {
      const fn = action === "submit" ? submitFormAction : saveDraftAction;
      const r = await fn({ templateId, title, notes, values });
      if (r?.error) {
        toast.error(r.error);
        return;
      }
      toast.success(action === "submit" ? "Compilazione inviata · automazioni attivate" : "Bozza salvata");
      if (r.submissionId) router.push(`/forms/submissions/${r.submissionId}`);
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-brand-cyan/30 bg-brand-cyan/5 p-3 text-xs text-leo-muted">
        <span className="font-mono text-brand-cyan">{templateCode}</span> · {templateTitle}
        <p className="mt-1">I campi marcati con * sono obbligatori. Una volta inviata, la compilazione potrebbe generare task, NC o blocchi operativi in base alle automazioni del template.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">Titolo compilazione</Label>
        <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={`${templateTitle} — ${new Date().toLocaleDateString("it-IT")}`} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {(schema?.fields ?? []).map((f) => (
          <div key={f.key} className={f.type === "textarea" ? "md:col-span-2" : ""}>
            <Label className="flex items-center gap-1">
              {f.label} {f.required && <span className="text-status-red">*</span>}
            </Label>
            <div className="mt-1.5">{renderField(f)}</div>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Note generali</Label>
        <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      </div>

      <div className="flex gap-2 border-t border-leo-border pt-4">
        <Button onClick={() => handle("submit")} disabled={isPending} className="flex-1">
          {isPending ? "Salvataggio..." : "Compila e invia"}
        </Button>
        <Button variant="outline" onClick={() => handle("draft")} disabled={isPending}>
          Salva bozza
        </Button>
      </div>
    </div>
  );
}
