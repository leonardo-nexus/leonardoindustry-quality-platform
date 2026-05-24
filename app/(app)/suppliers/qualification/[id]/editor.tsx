"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Save, CheckCircle2, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateQualificationAction, approveQualificationAction } from "../actions";

const TABS = [
  "legale", "certificazioni", "qualita", "sicurezza", "ambiente", "capacita", "affidabilita", "produzione",
] as const;

type Tab = typeof TABS[number];

const FIELDS: Record<Tab, { name: string; label: string; type?: string; critical?: boolean }[]> = {
  legale: [
    { name: "cciaa_valid", label: "CCIAA/Visura valida", type: "checkbox", critical: true },
    { name: "durc_valid", label: "DURC valido", type: "checkbox", critical: true },
    { name: "rct_rco_valid", label: "RCT/RCO valida", type: "checkbox", critical: true },
    { name: "antimafia_required", label: "Richiede antimafia", type: "checkbox" },
    { name: "antimafia_valid", label: "Antimafia valida", type: "checkbox" },
    { name: "fiscale_ok", label: "Documenti fiscali OK", type: "checkbox", critical: true },
  ],
  certificazioni: [
    { name: "iso_9001", label: "ISO 9001 attiva", type: "checkbox" },
    { name: "iso_14001", label: "ISO 14001 attiva", type: "checkbox" },
    { name: "iso_45001", label: "ISO 45001 attiva", type: "checkbox" },
    { name: "marcatura_ce", label: "Marcatura CE", type: "checkbox" },
    { name: "cert_saldatura_1090", label: "UNE-EN 1090", type: "checkbox" },
  ],
  qualita: [
    { name: "quality_system", label: "Sistema qualità", type: "text" },
    { name: "quality_responsible", label: "Responsabile qualità", type: "text" },
  ],
  sicurezza: [
    { name: "infortuni_3y", label: "Infortuni ultimi 3 anni", type: "number" },
    { name: "formazione_aggiornata", label: "Formazione aggiornata", type: "checkbox" },
  ],
  ambiente: [
    { name: "smaltimento_certificato", label: "Smaltimento certificato", type: "checkbox" },
  ],
  capacita: [
    { name: "anni_attivita", label: "Anni di attività", type: "number" },
    { name: "dipendenti", label: "Dipendenti", type: "number" },
    { name: "fatturato_annuo", label: "Fatturato annuo €", type: "number" },
  ],
  affidabilita: [
    { name: "ordini_totali", label: "Ordini totali", type: "number" },
    { name: "consegne_puntuali_pct", label: "Consegne puntuali %", type: "number" },
    { name: "contestazioni", label: "Contestazioni", type: "number" },
    { name: "ritardi", label: "Ritardi", type: "number" },
    { name: "nc_aperte", label: "NC aperte", type: "number" },
    { name: "deroghe_firmate", label: "Deroghe firmate", type: "number" },
    { name: "consegne_non_autorizzate", label: "Consegne non autorizzate", type: "number" },
    { name: "danni_economici_euro", label: "Danni economici €", type: "number" },
  ],
  produzione: [
    { name: "produzione_richiede_autorizzazione", label: "Produzione richiede autorizzazione", type: "checkbox", critical: true },
    { name: "consegna_richiede_autorizzazione", label: "Consegna richiede autorizzazione", type: "checkbox", critical: true },
    { name: "ricezione_richiede_piano_scarico", label: "Ricezione richiede piano scarico", type: "checkbox" },
    { name: "deroga_obbligatoria_se_non_pianificato", label: "Deroga obbligatoria se non pianificato", type: "checkbox" },
  ],
};

const TAB_TO_JSON_KEY: Record<Tab, string> = {
  legale: "legal_compliance",
  certificazioni: "certifications",
  qualita: "quality_data",
  sicurezza: "safety_data",
  ambiente: "environment_data",
  capacita: "capacity_data",
  affidabilita: "reliability_data",
  produzione: "production_delivery",
};

export function QualificationEditor({ qualification }: { qualification: any }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("legale");
  const [pending, startTransition] = useTransition();
  const [data, setData] = useState<Record<string, any>>({
    legal_compliance: qualification.legal_compliance ?? {},
    certifications: qualification.certifications ?? {},
    quality_data: qualification.quality_data ?? {},
    safety_data: qualification.safety_data ?? {},
    environment_data: qualification.environment_data ?? {},
    capacity_data: qualification.capacity_data ?? {},
    reliability_data: qualification.reliability_data ?? {},
    production_delivery: qualification.production_delivery ?? {},
  });

  function set(tab: Tab, name: string, value: any) {
    const key = TAB_TO_JSON_KEY[tab];
    setData({ ...data, [key]: { ...data[key], [name]: value } });
  }

  function save() {
    startTransition(async () => {
      const r = await updateQualificationAction(qualification.id, data);
      if (r?.error) toast.error(r.error);
      else {
        toast.success(`Score aggiornato a ${r.score}/100 · ${r.level}${r.blocked_for_orders ? " · BLOCCATO" : ""} · sync_outbox in pending`);
        router.refresh();
      }
    });
  }

  function approve() {
    const reason = prompt("Motivo approvazione (obbligatorio):");
    if (!reason || reason.length < 3) return;
    startTransition(async () => {
      const r = await approveQualificationAction(qualification.id, reason);
      if (r?.error) toast.error(r.error);
      else { toast.success("Qualifica approvata"); router.refresh(); }
    });
  }

  const tabFields = FIELDS[activeTab];
  const tabData = data[TAB_TO_JSON_KEY[activeTab]] ?? {};

  return (
    <Card className="leo-card">
      <CardHeader>
        <CardTitle className="text-base">Sezioni qualifica (8 tabs)</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Tabs */}
        <div className="mb-4 flex flex-wrap gap-1 border-b border-leo-border">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setActiveTab(t)}
              className={`px-3 py-1.5 text-xs font-medium border-b-2 -mb-px ${activeTab === t ? "border-brand-cyan text-brand-cyan" : "border-transparent text-leo-muted hover:text-leo-text"}`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Fields */}
        <div className="grid gap-3 sm:grid-cols-2">
          {tabFields.map((f) => (
            <label key={f.name} className="flex items-center gap-2 text-sm">
              {f.type === "checkbox" ? (
                <>
                  <input
                    type="checkbox"
                    checked={!!tabData[f.name]}
                    onChange={(e) => set(activeTab, f.name, e.target.checked)}
                  />
                  <span>{f.label}{f.critical && <span className="text-status-red ml-1">*</span>}</span>
                </>
              ) : (
                <span className="block w-full">
                  <span className="block text-xs text-leo-muted mb-1">{f.label}{f.critical && <span className="text-status-red ml-1">*</span>}</span>
                  <Input
                    type={f.type === "number" ? "number" : "text"}
                    value={tabData[f.name] ?? ""}
                    onChange={(e) => set(activeTab, f.name, f.type === "number" ? Number(e.target.value) : e.target.value)}
                  />
                </span>
              )}
            </label>
          ))}
        </div>

        {/* Footer actions */}
        <div className="mt-4 flex flex-wrap gap-2 border-t border-leo-border pt-3">
          <Button onClick={save} disabled={pending} className="mobile-action">
            {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Salva sezione + ricalcola score
          </Button>
          <Button onClick={approve} disabled={pending} variant="outline" className="mobile-action border-status-green/40 text-status-green">
            <CheckCircle2 className="mr-2 h-4 w-4" /> Approva qualifica
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
