"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateQualificationAction, approveQualificationAction } from "../actions";

const TABS = [
  "economica",
  "infrastruttura",
  "qualita",
  "personale",
  "sedi",
  "sostenibilita",
  "affidabilita",
  "produzione",
] as const;

type Tab = typeof TABS[number];

type Field = {
  name: string;
  label: string;
  type?: "text" | "number" | "checkbox";
  critical?: boolean;
};

type QualificationEditorRecord = {
  id: string;
  legal_compliance?: Record<string, unknown> | null;
  certifications?: Record<string, unknown> | null;
  quality_data?: Record<string, unknown> | null;
  safety_data?: Record<string, unknown> | null;
  environment_data?: Record<string, unknown> | null;
  capacity_data?: Record<string, unknown> | null;
  reliability_data?: Record<string, unknown> | null;
  production_delivery?: Record<string, unknown> | null;
};

type EditorData = Record<string, Record<string, unknown>>;

const TAB_LABEL: Record<Tab, string> = {
  economica: "Fatturato",
  infrastruttura: "Infrastruttura",
  qualita: "Qualita",
  personale: "Personale",
  sedi: "Sedi",
  sostenibilita: "Compliance",
  affidabilita: "Affidabilita",
  produzione: "Gate operativi",
};

const FIELDS: Record<Tab, Field[]> = {
  economica: [
    { name: "fatturato_annuo", label: "Fatturato annuo EUR", type: "number", critical: true },
    { name: "fatturato_2021", label: "Fatturato 2021 EUR", type: "number" },
    { name: "fatturato_2022", label: "Fatturato 2022 EUR", type: "number" },
    { name: "fatturato_2023", label: "Fatturato 2023 EUR", type: "number" },
    { name: "fatturato_2024", label: "Fatturato 2024 EUR", type: "number" },
    { name: "cagr_2021_2024", label: "CAGR 2021-2024 %", type: "number" },
    { name: "anni_attivita", label: "Anni di attivita", type: "number" },
    { name: "bilancio_verificato", label: "Bilancio verificato", type: "checkbox", critical: true },
    { name: "fiscale_ok", label: "Conformita fiscale OK", type: "checkbox", critical: true },
    { name: "rct_rco_valid", label: "RCT/RCO valida", type: "checkbox" },
    { name: "assicurazione_credito", label: "Assicurazione credito", type: "checkbox" },
  ],
  infrastruttura: [
    { name: "sedi_operative", label: "Sedi operative", type: "number" },
    { name: "stabilimenti", label: "Stabilimenti", type: "number" },
    { name: "macchinari_critici", label: "Macchinari critici disponibili", type: "checkbox", critical: true },
    { name: "capacita_produttiva", label: "Capacita produttiva adeguata", type: "checkbox", critical: true },
    { name: "magazzino_controllato", label: "Magazzino controllato", type: "checkbox" },
    { name: "piano_continuita", label: "Piano continuita operativa", type: "checkbox" },
  ],
  qualita: [
    { name: "quality_system", label: "Sistema qualita documentato", type: "checkbox", critical: true },
    { name: "quality_responsible", label: "Responsabile qualita nominato", type: "checkbox", critical: true },
    { name: "iso_9001", label: "ISO 9001 attiva", type: "checkbox", critical: true },
    { name: "marcatura_ce", label: "Marcatura CE", type: "checkbox" },
    { name: "cert_saldatura_1090", label: "UNE-EN 1090 / saldatura", type: "checkbox" },
  ],
  personale: [
    { name: "dipendenti", label: "Dipendenti", type: "number" },
    { name: "operatori_qualificati", label: "Operatori qualificati", type: "number" },
    { name: "saldatori_qualificati", label: "Saldatori qualificati", type: "number" },
    { name: "responsabile_tecnico", label: "Responsabile tecnico", type: "checkbox", critical: true },
    { name: "formazione_aggiornata", label: "Formazione aggiornata", type: "checkbox", critical: true },
    { name: "turni_copertura", label: "Copertura turni garantita", type: "checkbox" },
  ],
  sedi: [
    { name: "sede_legale", label: "Sede legale verificata", type: "checkbox", critical: true },
    { name: "sedi_operative", label: "Sedi operative", type: "number" },
    { name: "stabilimenti", label: "Stabilimenti", type: "number" },
    { name: "paesi_serviti", label: "Paesi serviti", type: "number" },
    { name: "copertura_locale", label: "Copertura locale cantieri", type: "checkbox" },
    { name: "logistica_tracciata", label: "Logistica tracciata", type: "checkbox" },
  ],
  sostenibilita: [
    { name: "iso_14001", label: "ISO 14001 attiva", type: "checkbox" },
    { name: "iso_45001", label: "ISO 45001 attiva", type: "checkbox", critical: true },
    { name: "smaltimento_certificato", label: "Smaltimento certificato", type: "checkbox" },
    { name: "rating_esg", label: "Rating / report ESG", type: "checkbox" },
    { name: "codice_etico", label: "Codice etico adottato", type: "checkbox" },
    { name: "privacy_gdpr", label: "Privacy GDPR conforme", type: "checkbox", critical: true },
    { name: "durc_valid", label: "DURC valido", type: "checkbox", critical: true },
  ],
  affidabilita: [
    { name: "ordini_totali", label: "Ordini totali", type: "number" },
    { name: "consegne_puntuali_pct", label: "Consegne puntuali %", type: "number" },
    { name: "contestazioni", label: "Contestazioni", type: "number" },
    { name: "ritardi", label: "Ritardi", type: "number" },
    { name: "nc_aperte", label: "NC aperte", type: "number" },
    { name: "deroghe_firmate", label: "Deroghe firmate", type: "number" },
    { name: "consegne_non_autorizzate", label: "Consegne non autorizzate", type: "number" },
    { name: "danni_economici_euro", label: "Danni economici EUR", type: "number" },
  ],
  produzione: [
    { name: "produzione_richiede_autorizzazione", label: "Produzione richiede autorizzazione", type: "checkbox", critical: true },
    { name: "consegna_richiede_autorizzazione", label: "Consegna richiede autorizzazione", type: "checkbox", critical: true },
    { name: "ricezione_richiede_piano_scarico", label: "Ricezione richiede piano scarico", type: "checkbox" },
    { name: "deroga_obbligatoria_se_non_pianificato", label: "Deroga obbligatoria se non pianificato", type: "checkbox" },
  ],
};

const TAB_TO_JSON_KEY: Record<Tab, string> = {
  economica: "capacity_data",
  infrastruttura: "capacity_data",
  qualita: "quality_data",
  personale: "capacity_data",
  sedi: "capacity_data",
  sostenibilita: "environment_data",
  affidabilita: "reliability_data",
  produzione: "production_delivery",
};

const MIRROR_TO_JSON_KEY: Partial<Record<Tab, Record<string, string>>> = {
  economica: {
    bilancio_verificato: "capacity_data",
    fiscale_ok: "legal_compliance",
    rct_rco_valid: "legal_compliance",
  },
  qualita: {
    iso_9001: "certifications",
    marcatura_ce: "certifications",
    cert_saldatura_1090: "certifications",
  },
  personale: {
    formazione_aggiornata: "safety_data",
  },
  sostenibilita: {
    iso_14001: "certifications",
    iso_45001: "certifications",
    durc_valid: "legal_compliance",
  },
};

export function QualificationEditor({ qualification }: { qualification: QualificationEditorRecord }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("economica");
  const [pending, startTransition] = useTransition();
  const [data, setData] = useState<EditorData>({
    legal_compliance: qualification.legal_compliance ?? {},
    certifications: qualification.certifications ?? {},
    quality_data: qualification.quality_data ?? {},
    safety_data: qualification.safety_data ?? {},
    environment_data: qualification.environment_data ?? {},
    capacity_data: qualification.capacity_data ?? {},
    reliability_data: qualification.reliability_data ?? {},
    production_delivery: qualification.production_delivery ?? {},
  });

  function set(tab: Tab, name: string, value: unknown) {
    const primaryKey = TAB_TO_JSON_KEY[tab];
    const mirrorKey = MIRROR_TO_JSON_KEY[tab]?.[name];
    setData((current) => ({
      ...current,
      [primaryKey]: { ...current[primaryKey], [name]: value },
      ...(mirrorKey ? { [mirrorKey]: { ...current[mirrorKey], [name]: value } } : {}),
    }));
  }

  function save() {
    startTransition(async () => {
      const result = await updateQualificationAction(qualification.id, data);
      if (result?.error) toast.error(result.error);
      else {
        toast.success(`Score aggiornato a ${result.score}/100 - ${result.level}${result.blocked_for_orders ? " - BLOCCATO" : ""}`);
        router.refresh();
      }
    });
  }

  function approve() {
    const reason = prompt("Motivo approvazione");
    if (!reason || reason.trim().length < 3) return;
    startTransition(async () => {
      const result = await approveQualificationAction(qualification.id, reason);
      if (result?.error) toast.error(result.error);
      else {
        toast.success("Qualifica approvata");
        router.refresh();
      }
    });
  }

  const tabFields = FIELDS[activeTab];
  const tabData = data[TAB_TO_JSON_KEY[activeTab]] ?? {};

  return (
    <Card className="leo-card">
      <CardHeader>
        <CardTitle className="text-base">Scheda valutazione requisiti</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex flex-wrap gap-1 border-b border-leo-border">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`-mb-px border-b-2 px-3 py-1.5 text-xs font-medium ${
                activeTab === tab ? "border-brand-cyan text-brand-cyan" : "border-transparent text-leo-muted hover:text-leo-text"
              }`}
            >
              {TAB_LABEL[tab]}
            </button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {tabFields.map((field) => {
            const mirrorKey = MIRROR_TO_JSON_KEY[activeTab]?.[field.name];
            const value = mirrorKey ? (data[mirrorKey]?.[field.name] ?? tabData[field.name] ?? "") : (tabData[field.name] ?? "");
            const inputValue = typeof value === "string" || typeof value === "number" ? value : "";
            return (
              <label key={field.name} className="flex items-center gap-2 text-sm">
                {field.type === "checkbox" ? (
                  <>
                    <input
                      type="checkbox"
                      checked={!!value}
                      onChange={(event) => set(activeTab, field.name, event.target.checked)}
                      className="h-4 w-4 rounded border-leo-border accent-brand-cyan"
                    />
                    <span>{field.label}{field.critical && <span className="ml-1 text-status-red">*</span>}</span>
                  </>
                ) : (
                  <span className="block w-full">
                    <span className="mb-1 block text-xs text-leo-muted">{field.label}{field.critical && <span className="ml-1 text-status-red">*</span>}</span>
                    <Input
                      type={field.type === "number" ? "number" : "text"}
                      value={inputValue}
                      onChange={(event) => set(activeTab, field.name, field.type === "number" ? Number(event.target.value) : event.target.value)}
                    />
                  </span>
                )}
              </label>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap gap-2 border-t border-leo-border pt-3">
          <Button onClick={save} disabled={pending} className="mobile-action">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salva e ricalcola score
          </Button>
          <Button onClick={approve} disabled={pending} variant="outline" className="mobile-action border-status-green/40 text-status-green">
            <CheckCircle2 className="h-4 w-4" />
            Approva qualifica
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
