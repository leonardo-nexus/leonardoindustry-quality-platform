"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Save, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { saveExtractedTextAction, verifyOcrAction } from "../actions";

const FIELDS_BY_DOC_TYPE: Record<string, string[]> = {
  bolla_ddt: ["numero_bolla", "data_bolla", "mittente", "destinatario", "n_colli", "peso_kg", "descrizione_merce"],
  certificato_materiale: ["numero_certificato", "data_emissione", "materiale", "lotto", "fornitore", "esito"],
  scheda_tecnica: ["codice_articolo", "descrizione", "revisione", "produttore", "specifiche"],
  fattura: ["numero_fattura", "data_fattura", "fornitore", "imponibile", "iva", "totale"],
  preventivo: ["numero_preventivo", "data", "fornitore", "importo", "validita"],
  verbale: ["numero_verbale", "data", "argomento", "partecipanti", "esito"],
  contratto: ["numero_contratto", "data_firma", "cliente", "valore", "scadenza", "penali"],
  etichetta: ["codice", "lotto", "data_produzione", "scadenza"],
  seriale: ["seriale", "produttore", "modello"],
  altro: ["nota"],
};

export function OcrReviewForm({ ocrId, initialRawText, initialFields, docType, status }: { ocrId: string; initialRawText: string; initialFields: Record<string, any>; docType: string | null; status: string }) {
  const router = useRouter();
  const [rawText, setRawText] = useState(initialRawText);
  const [fields, setFields] = useState<Record<string, any>>(initialFields);
  const [pending, startTransition] = useTransition();
  const fieldList = FIELDS_BY_DOC_TYPE[docType ?? "altro"] ?? ["nota"];

  function save() {
    startTransition(async () => {
      const r = await saveExtractedTextAction(ocrId, rawText, fields);
      if (r?.error) toast.error(r.error);
      else { toast.success("Trascrizione salvata"); router.refresh(); }
    });
  }

  function verify() {
    startTransition(async () => {
      const r = await verifyOcrAction(ocrId);
      if (r?.error) toast.error(r.error);
      else { toast.success("OCR verificato manualmente"); router.refresh(); }
    });
  }

  return (
    <div className="space-y-3">
      <label className="block text-xs">
        <span className="block text-leo-muted mb-1">Testo trascritto (manuale)</span>
        <Textarea
          rows={8}
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder="Trascrivi qui il contenuto del documento scansionato..."
          className="font-mono text-xs"
        />
      </label>

      <div>
        <div className="text-xs text-leo-muted mb-1">Campi strutturati ({docType})</div>
        <div className="space-y-2">
          {fieldList.map((f) => (
            <label key={f} className="block text-xs">
              <span className="block text-leo-muted mb-1">{f.replace(/_/g, " ")}</span>
              <Input
                value={fields[f] ?? ""}
                onChange={(e) => setFields({ ...fields, [f]: e.target.value })}
              />
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-leo-border pt-3">
        <Button onClick={save} disabled={pending} className="mobile-action">
          {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Salva trascrizione
        </Button>
        {status === "processato" && (
          <Button onClick={verify} disabled={pending} variant="outline" className="mobile-action border-status-green/40 text-status-green">
            <CheckCircle2 className="mr-2 h-4 w-4" /> Verifica manualmente
          </Button>
        )}
      </div>
      <p className="text-[10px] text-leo-muted">
        ⓘ Non è cablato un motore OCR automatico. Trascrizione manuale assistita: testo libero + campi tipici per il tipo documento. Audit log automatico.
      </p>
    </div>
  );
}
