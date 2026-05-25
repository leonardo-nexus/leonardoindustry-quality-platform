export const SCORE_WEIGHTS = {
  economica: 18,
  infrastruttura: 17,
  qualita: 15,
  documentale: 15,
  personale: 12,
  sedi: 8,
  sostenibilita: 15,
} as const;

export type QualificationCategoryKey = keyof typeof SCORE_WEIGHTS;

export const QUALIFICATION_CATEGORIES: Array<{
  key: QualificationCategoryKey;
  label: string;
  shortLabel: string;
  color: string;
}> = [
  { key: "economica", label: "Fatturato e solidita economica", shortLabel: "Fatturato", color: "#3b82f6" },
  { key: "infrastruttura", label: "Infrastruttura e capacita operativa", shortLabel: "Infrastruttura", color: "#8b5cf6" },
  { key: "qualita", label: "Qualita", shortLabel: "Qualita", color: "#10b981" },
  { key: "documentale", label: "Qualifiche documentali", shortLabel: "Documenti", color: "#14b8a6" },
  { key: "personale", label: "Personale e competenze", shortLabel: "Personale", color: "#f97316" },
  { key: "sedi", label: "Sedi e ubicazione", shortLabel: "Sedi", color: "#06b6d4" },
  { key: "sostenibilita", label: "Sostenibilita e compliance", shortLabel: "Compliance", color: "#84cc16" },
];

export const DOCUMENT_QUALIFICATION_REQUIREMENTS = [
  { document_type: "cciaa_visura", label: "CCIAA / Visura camerale", area: "Legale", mandatory: true, points: 10 },
  { document_type: "durc", label: "DURC valido", area: "Legale", mandatory: true, points: 10 },
  { document_type: "iso_9001", label: "Certificato ISO 9001", area: "Qualita", mandatory: true, points: 12 },
  { document_type: "iso_14001", label: "Certificato ISO 14001", area: "Ambiente", mandatory: false, points: 8 },
  { document_type: "iso_45001", label: "Certificato ISO 45001", area: "Sicurezza", mandatory: true, points: 8 },
  { document_type: "marcatura_ce_dop", label: "Marcatura CE / DoP", area: "Conformita", mandatory: false, points: 8 },
  { document_type: "bilancio", label: "Bilanci ultimi 2 esercizi", area: "Finanziaria", mandatory: true, points: 10 },
  { document_type: "polizza_rc", label: "Polizza RC / RCT-RCO", area: "Assicurativa", mandatory: true, points: 8 },
  { document_type: "codice_etico", label: "Codice etico", area: "Etica", mandatory: false, points: 6 },
  { document_type: "privacy_gdpr", label: "Privacy / GDPR", area: "Privacy", mandatory: true, points: 6 },
  { document_type: "report_esg", label: "Report o rating ESG", area: "Sostenibilita", mandatory: false, points: 6 },
  { document_type: "referenze_progetti", label: "Referenze lavori/progetti", area: "Tecnica", mandatory: false, points: 8 },
] as const;

export type DocumentQualificationRequirement = typeof DOCUMENT_QUALIFICATION_REQUIREMENTS[number];

export interface DocumentQualificationState {
  document_type: string;
  uploaded?: boolean | null;
  verified?: boolean | null;
}

export interface QualificationScoreInput {
  legal_compliance?: Record<string, unknown> | null;
  certifications?: Record<string, unknown> | null;
  quality_data?: Record<string, unknown> | null;
  safety_data?: Record<string, unknown> | null;
  environment_data?: Record<string, unknown> | null;
  capacity_data?: Record<string, unknown> | null;
  reliability_data?: Record<string, unknown> | null;
  production_delivery?: Record<string, unknown> | null;
  documents_uploaded?: number;
  documents_required?: number;
  documents?: DocumentQualificationState[] | null;
}

function asNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/\./g, "").replace(",", "."));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function hasValue(value: unknown): boolean {
  return value === true || (typeof value === "string" && value.trim().length > 0) || asNumber(value) > 0;
}

function boolScore(value: unknown, points: number): number {
  return value === true || hasValue(value) ? points : 0;
}

function clamp100(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function turnoverScore(value: unknown): number {
  const turnover = asNumber(value);
  if (turnover >= 10_000_000) return 35;
  if (turnover >= 5_000_000) return 30;
  if (turnover >= 1_000_000) return 22;
  if (turnover > 0) return 12;
  return 0;
}

function yearsScore(value: unknown): number {
  const years = asNumber(value);
  if (years >= 10) return 15;
  if (years >= 5) return 10;
  if (years > 0) return 5;
  return 0;
}

function employeesScore(value: unknown): number {
  const employees = asNumber(value);
  if (employees >= 50) return 20;
  if (employees >= 10) return 12;
  if (employees > 0) return 5;
  return 0;
}

function countScore(value: unknown, thresholds: Array<[number, number]>): number {
  const count = asNumber(value);
  for (const [minimum, points] of thresholds) {
    if (count >= minimum) return points;
  }
  return 0;
}

function reliabilityBonus(reliability: Record<string, unknown>): number {
  const punctuality = asNumber(reliability.consegne_puntuali_pct);
  if (punctuality >= 95) return 10;
  if (punctuality >= 85) return 7;
  if (punctuality >= 70) return 4;
  return 0;
}

export function computeDocumentQualificationScore(documents: DocumentQualificationState[] | null | undefined): number {
  if (!documents || documents.length === 0) return 0;
  const byType = new Map(documents.map((document) => [document.document_type, document]));
  const total = DOCUMENT_QUALIFICATION_REQUIREMENTS.reduce((sum, requirement) => sum + requirement.points, 0);
  const earned = DOCUMENT_QUALIFICATION_REQUIREMENTS.reduce((sum, requirement) => {
    const document = byType.get(requirement.document_type);
    return document?.uploaded && document?.verified ? sum + requirement.points : sum;
  }, 0);
  return clamp100((earned / total) * 100);
}

export function computeQualificationScore(input: QualificationScoreInput): {
  score: number;
  level: string;
  breakdown: Record<QualificationCategoryKey, number>;
  reasons: string[];
} {
  const legal = input.legal_compliance ?? {};
  const certs = input.certifications ?? {};
  const quality = input.quality_data ?? {};
  const safety = input.safety_data ?? {};
  const environment = input.environment_data ?? {};
  const capacity = input.capacity_data ?? {};
  const reliability = input.reliability_data ?? {};
  const production = input.production_delivery ?? {};
  const documentsRequired = Math.max(1, input.documents_required ?? 0);
  const documentsUploaded = Math.min(input.documents_uploaded ?? 0, documentsRequired);
  const documentCompleteness = documentsUploaded / documentsRequired;
  const documentScore = input.documents ? computeDocumentQualificationScore(input.documents) : clamp100(documentCompleteness * 100);

  const breakdown: Record<QualificationCategoryKey, number> = {
    economica: clamp100(
      turnoverScore(capacity.fatturato_annuo) +
      yearsScore(capacity.anni_attivita) +
      boolScore(legal.fiscale_ok, 15) +
      boolScore(capacity.bilancio_verificato ?? capacity.bilancio_ok, 20) +
      boolScore(legal.rct_rco_valid, 10) +
      boolScore(capacity.assicurazione_credito, 5),
    ),
    infrastruttura: clamp100(
      countScore(capacity.sedi_operative, [[3, 20], [1, 12]]) +
      countScore(capacity.stabilimenti, [[2, 18], [1, 12]]) +
      boolScore(capacity.macchinari_critici, 18) +
      boolScore(capacity.capacita_produttiva, 18) +
      boolScore(capacity.magazzino_controllato, 12) +
      boolScore(capacity.piano_continuita, 14) +
      boolScore(production.ricezione_richiede_piano_scarico, 8) +
      yearsScore(capacity.anni_attivita),
    ),
    qualita: clamp100(
      boolScore(certs.iso_9001, 25) +
      boolScore(quality.quality_system, 18) +
      boolScore(quality.quality_responsible, 15) +
      boolScore(certs.marcatura_ce, 10) +
      boolScore(certs.cert_saldatura_1090, 10) +
      (asNumber(reliability.nc_aperte) === 0 ? 5 : asNumber(reliability.nc_aperte) <= 2 ? 2 : 0) +
      (asNumber(reliability.contestazioni) === 0 ? 5 : asNumber(reliability.contestazioni) <= 1 ? 2 : 0),
    ),
    documentale: documentScore,
    personale: clamp100(
      employeesScore(capacity.dipendenti) +
      boolScore(safety.formazione_aggiornata, 20) +
      boolScore(capacity.responsabile_tecnico, 15) +
      countScore(capacity.operatori_qualificati, [[10, 20], [1, 10]]) +
      countScore(capacity.saldatori_qualificati, [[5, 15], [1, 8]]) +
      boolScore(capacity.turni_copertura, 10) +
      reliabilityBonus(reliability),
    ),
    sedi: clamp100(
      boolScore(input.capacity_data?.sede_legale ?? input.legal_compliance?.sede_legale, 20) +
      boolScore(capacity.country_presente, 10) +
      countScore(capacity.sedi_operative, [[3, 25], [1, 18]]) +
      countScore(capacity.stabilimenti, [[2, 20], [1, 15]]) +
      countScore(capacity.paesi_serviti, [[5, 20], [1, 10]]) +
      boolScore(capacity.copertura_locale, 15) +
      boolScore(capacity.logistica_tracciata, 10),
    ),
    sostenibilita: clamp100(
      boolScore(certs.iso_14001, 20) +
      boolScore(certs.iso_45001, 18) +
      boolScore(environment.smaltimento_certificato, 15) +
      boolScore(environment.rating_esg ?? environment.report_esg, 15) +
      boolScore(environment.codice_etico, 12) +
      boolScore(environment.privacy_gdpr, 12) +
      boolScore(legal.durc_valid, 8),
    ),
  };

  const score = clamp100(
    QUALIFICATION_CATEGORIES.reduce((sum, category) => {
      return sum + (breakdown[category.key] * SCORE_WEIGHTS[category.key]) / 100;
    }, 0),
  );

  const reasons: string[] = [];
  if (documentsUploaded < documentsRequired) reasons.push(`Documenti caricati ${documentsUploaded}/${documentsRequired}`);
  if (!certs.iso_9001) reasons.push("ISO 9001 mancante");
  if (!legal.fiscale_ok) reasons.push("Conformita fiscale non confermata");
  for (const category of QUALIFICATION_CATEGORIES) {
    if (breakdown[category.key] < 60) reasons.push(`${category.label} sotto soglia`);
  }

  let level = "not_qualified";
  if (score >= 90) level = "qualified_excellent";
  else if (score >= 75) level = "qualified";
  else if (score >= 60) level = "qualified_with_reserve";
  else if (score >= 40) level = "suspended";

  return { score, level, breakdown, reasons };
}
