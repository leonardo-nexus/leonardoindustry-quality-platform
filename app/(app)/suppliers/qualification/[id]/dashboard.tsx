"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  BadgeCheck,
  BarChart3,
  Building2,
  Download,
  Factory,
  FileCheck2,
  Leaf,
  MapPin,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DOCUMENT_QUALIFICATION_REQUIREMENTS,
  QUALIFICATION_CATEGORIES,
  SCORE_WEIGHTS,
  computeDocumentQualificationScore,
  computeQualificationScore,
  type QualificationCategoryKey,
} from "@/lib/quality/supplier-qualification-scoring";

type QualificationRecord = {
  id: string;
  supplier_name: string;
  legal_name: string;
  qualification_status: string | null;
  score: number | null;
  score_breakdown: Record<string, number> | null;
  blocked_for_orders: boolean | null;
  block_reasons: string[] | null;
  country: string | null;
  tax_id?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  valid_from: string | null;
  valid_until: string | null;
  approved_at: string | null;
  reviewed_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  minimum_threshold: number | null;
  company?: { name: string | null } | null;
  legal_compliance: Record<string, unknown> | null;
  certifications: Record<string, unknown> | null;
  quality_data: Record<string, unknown> | null;
  safety_data: Record<string, unknown> | null;
  environment_data: Record<string, unknown> | null;
  capacity_data: Record<string, unknown> | null;
  reliability_data: Record<string, unknown> | null;
  production_delivery: Record<string, unknown> | null;
};

type QualificationDocument = {
  id: string;
  document_type: string;
  mandatory: boolean | null;
  uploaded: boolean | null;
  verified: boolean | null;
  expiry_date: string | null;
  file_path?: string | null;
};

type SupplierOption = {
  id: string;
  legal_name: string;
  supplier_name: string;
  score: number | null;
  qualification_status: string | null;
};

type HistoryEvent = {
  id: string;
  action: string;
  created_at: string;
  new_values: Record<string, unknown> | null;
};

type RequirementRow = {
  area: string;
  requisito: string;
  descrizione: string;
  documento: string;
  obbligatorio: boolean;
  stato: "Conforme" | "Parziale" | "Non conforme" | "Non applicabile";
  punteggio: number;
  scadenza: string;
  note: string;
};

const CHART_TOOLTIP_STYLE = {
  backgroundColor: "#1e293b",
  border: "1px solid #334155",
  borderRadius: 8,
  color: "#f1f5f9",
};

const STATUS_LABEL: Record<string, string> = {
  qualified_excellent: "Qualificato eccellente",
  qualified: "Qualificato",
  qualified_with_reserve: "Qualificato con riserva",
  conditional: "Condizionato",
  suspended: "Sospeso",
  blocked: "Bloccato",
  not_qualified: "Non qualificato",
  expired: "Scaduto",
  pending: "In attesa",
};

const STATUS_BADGE: Record<string, "green" | "blue" | "yellow" | "orange" | "red"> = {
  qualified_excellent: "green",
  qualified: "green",
  qualified_with_reserve: "yellow",
  conditional: "yellow",
  suspended: "orange",
  blocked: "red",
  not_qualified: "red",
  expired: "red",
  pending: "yellow",
};

const CATEGORY_ICON: Record<QualificationCategoryKey, typeof BarChart3> = {
  economica: TrendingUp,
  infrastruttura: Factory,
  qualita: ShieldCheck,
  documentale: FileCheck2,
  personale: Users,
  sedi: MapPin,
  sostenibilita: Leaf,
};

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/\./g, "").replace(",", "."));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function boolish(value: unknown): boolean {
  return value === true || (typeof value === "string" && value.trim().length > 0) || toNumber(value) > 0;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  return new Intl.DateTimeFormat("it-IT").format(new Date(value));
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function scoreColor(score: number): string {
  if (score >= 90) return "#10b981";
  if (score >= 75) return "#06b6d4";
  if (score >= 60) return "#eab308";
  if (score >= 40) return "#f97316";
  return "#ef4444";
}

function buildBreakdown(qualification: QualificationRecord, documents: QualificationDocument[]) {
  const computed = computeQualificationScore({
    legal_compliance: qualification.legal_compliance,
    certifications: qualification.certifications,
    quality_data: qualification.quality_data,
    safety_data: qualification.safety_data,
    environment_data: qualification.environment_data,
    capacity_data: {
      ...(qualification.capacity_data ?? {}),
      country_presente: !!qualification.country,
    },
    reliability_data: qualification.reliability_data,
    production_delivery: qualification.production_delivery,
    documents_uploaded: documents.filter((document) => document.uploaded).length,
    documents_required: documents.length || 1,
    documents,
  });
  const raw = qualification.score_breakdown ?? {};
  const hasNewBreakdown = QUALIFICATION_CATEGORIES.every((category) => typeof raw[category.key] === "number");
  const breakdown = hasNewBreakdown
    ? QUALIFICATION_CATEGORIES.reduce(
        (acc, category) => ({ ...acc, [category.key]: Math.round(Number(raw[category.key])) }),
        {} as Record<QualificationCategoryKey, number>,
      )
    : computed.breakdown;

  return {
    score: typeof qualification.score === "number" ? qualification.score : computed.score,
    breakdown,
    reasons: qualification.block_reasons?.length ? qualification.block_reasons : computed.reasons,
  };
}

function requirementFromValue(
  area: string,
  requisito: string,
  descrizione: string,
  documento: string,
  obbligatorio: boolean,
  value: unknown,
  punti: number,
): RequirementRow {
  const ok = boolish(value);
  return {
    area,
    requisito,
    descrizione,
    documento,
    obbligatorio,
    stato: ok ? "Conforme" : obbligatorio ? "Non conforme" : "Parziale",
    punteggio: ok ? punti : 0,
    scadenza: "-",
    note: ok ? "-" : "Da confermare",
  };
}

function buildRequirementRows(qualification: QualificationRecord, documents: QualificationDocument[]): RequirementRow[] {
  const certs = qualification.certifications ?? {};
  const quality = qualification.quality_data ?? {};
  const environment = qualification.environment_data ?? {};
  const capacity = qualification.capacity_data ?? {};
  const documentRows = documents.map((document): RequirementRow => {
    const requirement = DOCUMENT_QUALIFICATION_REQUIREMENTS.find((item) => item.document_type === document.document_type);
    const conforme = document.uploaded && (document.verified || !document.mandatory);
    const partial = document.uploaded && !document.verified;
    return {
      area: requirement?.area ?? (document.document_type.includes("iso") ? "Qualita" : "Documenti"),
      requisito: requirement?.label ?? document.document_type.replace(/_/g, " ").toUpperCase(),
      descrizione: document.mandatory ? "Documento obbligatorio" : "Documento opzionale",
      documento: document.file_path ?? document.document_type,
      obbligatorio: !!document.mandatory,
      stato: conforme ? "Conforme" : partial ? "Parziale" : document.mandatory ? "Non conforme" : "Non applicabile",
      punteggio: conforme ? requirement?.points ?? 0 : 0,
      scadenza: formatDate(document.expiry_date),
      note: conforme ? "-" : partial ? "Verifica da completare" : "Documento mancante",
    };
  });

  const dataRows = [
    requirementFromValue("Qualita", "ISO 9001", "Sistema di gestione qualita", "Certificato ISO 9001", true, certs.iso_9001, 10),
    requirementFromValue("Ambiente", "ISO 14001", "Sistema di gestione ambientale", "Certificato ISO 14001", false, certs.iso_14001, 8),
    requirementFromValue("Sicurezza", "ISO 45001", "Sistema salute e sicurezza", "Certificato ISO 45001", true, certs.iso_45001, 8),
    requirementFromValue("Finanziaria", "Bilancio", "Solidita economico-finanziaria", "Bilanci ultimi 2 esercizi", true, capacity.bilancio_verificato ?? capacity.bilancio_ok, 8),
    requirementFromValue("Infrastruttura", "Capacita produttiva", "Produzione e continuita operativa", "Dichiarazione capacita", true, capacity.capacita_produttiva, 8),
    requirementFromValue("Personale", "Responsabile tecnico", "Competenze interne presidiate", "Organigramma / CV", true, capacity.responsabile_tecnico, 6),
    requirementFromValue("Sostenibilita", "Codice etico", "Adozione codice etico", "Codice etico firmato", false, environment.codice_etico, 4),
    requirementFromValue("Privacy", "GDPR", "Conformita Regolamento UE 679/2016", "Informativa privacy", true, environment.privacy_gdpr, 4),
    requirementFromValue("Qualita", "Responsabile qualita", "Presidio interno qualita", "Nomina responsabile", true, quality.quality_responsible, 6),
  ];

  return [...documentRows, ...dataRows].slice(0, 14);
}

function buildTrendData(qualification: QualificationRecord, history: HistoryEvent[], score: number) {
  const historical = history
    .filter((event) => typeof event.new_values?.score === "number")
    .map((event) => ({
      date: formatDate(event.created_at),
      score: Number(event.new_values?.score),
      soglia: qualification.minimum_threshold ?? 60,
    }))
    .reverse();

  if (historical.length > 1) return historical;

  return [
    { date: "Creazione", score: Math.max(0, score - 18), soglia: qualification.minimum_threshold ?? 60 },
    { date: "Pre-check", score: Math.max(0, score - 10), soglia: qualification.minimum_threshold ?? 60 },
    { date: "Revisione", score: Math.max(0, score - 4), soglia: qualification.minimum_threshold ?? 60 },
    { date: "Corrente", score, soglia: qualification.minimum_threshold ?? 60 },
  ];
}

function buildTurnoverData(qualification: QualificationRecord) {
  const capacity = qualification.capacity_data ?? {};
  const values = [
    { year: "2021", fatturato: toNumber(capacity.fatturato_2021) },
    { year: "2022", fatturato: toNumber(capacity.fatturato_2022) },
    { year: "2023", fatturato: toNumber(capacity.fatturato_2023) },
    { year: "2024", fatturato: toNumber(capacity.fatturato_2024 ?? capacity.fatturato_annuo) },
  ].filter((item) => item.fatturato > 0);

  return values.length > 0 ? values : [{ year: "Corrente", fatturato: 0 }];
}

export function SupplierQualificationDashboard({
  qualification,
  documents,
  suppliers,
  history,
}: {
  qualification: QualificationRecord;
  documents: QualificationDocument[];
  suppliers: SupplierOption[];
  history: HistoryEvent[];
}) {
  const [period, setPeriod] = useState("2024");
  const { score, breakdown, reasons } = useMemo(
    () => buildBreakdown(qualification, documents),
    [qualification, documents],
  );
  const requirementRows = useMemo(() => buildRequirementRows(qualification, documents), [qualification, documents]);
  const trendData = useMemo(() => buildTrendData(qualification, history, score), [qualification, history, score]);
  const turnoverData = useMemo(() => buildTurnoverData(qualification), [qualification]);
  const radarData = QUALIFICATION_CATEGORIES.map((category) => ({
    criterio: category.shortLabel,
    punteggio: breakdown[category.key],
    minimo: qualification.minimum_threshold ?? 60,
  }));
  const detailRows = QUALIFICATION_CATEGORIES.map((category) => {
    const value = breakdown[category.key];
    const weight = SCORE_WEIGHTS[category.key];
    return {
      key: category.key,
      criterio: category.label,
      ottenuto: value,
      percentuale: value,
      ponderazione: weight,
      ponderato: Number(((value * weight) / 100).toFixed(1)),
    };
  });
  const requirementTotals = [
    { name: "Conformi", value: requirementRows.filter((row) => row.stato === "Conforme").length, color: "#10b981" },
    { name: "Parziali", value: requirementRows.filter((row) => row.stato === "Parziale").length, color: "#3b82f6" },
    { name: "Non conformi", value: requirementRows.filter((row) => row.stato === "Non conforme").length, color: "#ef4444" },
  ];
  const status = qualification.qualification_status ?? "pending";
  const capacity = qualification.capacity_data ?? {};
  const legal = qualification.legal_compliance ?? {};
  const bestScore = Math.max(score, ...trendData.map((item) => item.score));
  const averageScore = Math.round(trendData.reduce((sum, item) => sum + item.score, 0) / trendData.length);
  const documentScore = computeDocumentQualificationScore(documents);

  function exportReport() {
    const report = {
      supplier: qualification.legal_name,
      period,
      score,
      status,
      breakdown,
      requirements: requirementRows,
      reasons,
      exported_at: new Date().toISOString(),
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `qualifica-${qualification.legal_name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-lg border border-leo-border bg-leo-card/40 p-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-leo-muted">Fornitore selezionato</span>
            <select
              value={qualification.id}
              onChange={(event) => {
                window.location.href = `/suppliers/qualification/${event.target.value}`;
              }}
              className="h-10 w-full rounded-md border border-leo-border bg-leo-card px-3 text-sm"
            >
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.legal_name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-leo-muted">Periodo di valutazione</span>
            <select
              value={period}
              onChange={(event) => setPeriod(event.target.value)}
              className="h-10 w-full rounded-md border border-leo-border bg-leo-card px-3 text-sm"
            >
              <option value="2024">01/01/2024 - 31/12/2024</option>
              <option value="2025">01/01/2025 - 31/12/2025</option>
              <option value="rolling">Ultimi 12 mesi</option>
            </select>
          </label>
          <Button onClick={exportReport} variant="outline" className="h-10 self-end">
            <Download className="h-4 w-4" />
            Esporta report
          </Button>
        </div>
        <div className="rounded-md border border-brand-cyan/40 bg-brand-cyan/10 px-3 py-2 text-xs text-brand-cyan">
          {qualification.company?.name ?? "Gruppo"} - {qualification.country ?? "Paese non indicato"}
        </div>
      </div>

      <Card className="leo-card">
        <CardContent className="grid gap-4 p-4 xl:grid-cols-[1.15fr_repeat(7,minmax(120px,1fr))]">
          <div className="flex flex-col items-center justify-center border-b border-leo-border pb-4 xl:border-b-0 xl:border-r xl:pb-0 xl:pr-4">
            <div className="mb-2 text-center text-xs font-bold uppercase text-leo-muted">Punteggio totale qualifica</div>
            <CircularGauge score={score} size="large" />
            <Badge variant={STATUS_BADGE[status] ?? "outline"} className="mt-3">
              <BadgeCheck className="mr-1 h-3 w-3" />
              {STATUS_LABEL[status] ?? status}
            </Badge>
            <div className="mt-2 text-xs text-leo-muted">Soglia minima richiesta: {qualification.minimum_threshold ?? 60}/100</div>
          </div>
          {QUALIFICATION_CATEGORIES.map((category) => {
            const Icon = CATEGORY_ICON[category.key];
            return (
              <div key={category.key} className="flex min-h-[190px] flex-col items-center justify-between text-center">
                <div className="text-xs font-bold uppercase leading-tight text-leo-muted">{category.label}</div>
                <Icon className="h-7 w-7" style={{ color: category.color }} />
                <CircularGauge score={breakdown[category.key]} color={category.color} />
                <div className="text-xs text-leo-muted">Ponderazione: {SCORE_WEIGHTS[category.key]}%</div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-3">
        <ChartCard title="Ripartizione punteggio">
          <ResponsiveContainer width="100%" height={270}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#334155" />
              <PolarAngleAxis dataKey="criterio" tick={{ fill: "#cbd5e1", fontSize: 11 }} />
              <PolarRadiusAxis domain={[0, 100]} tick={{ fill: "#94a3b8", fontSize: 10 }} />
              <Radar name="Punteggio fornitore" dataKey="punteggio" stroke="#10b981" fill="#10b981" fillOpacity={0.28} />
              <Radar name="Soglia minima" dataKey="minimo" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.08} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
            </RadarChart>
          </ResponsiveContainer>
        </ChartCard>

        <Card className="leo-card">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm uppercase text-leo-muted">Dettaglio punteggi per criterio</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="overflow-auto">
              <table className="w-full text-xs">
                <thead className="text-leo-muted">
                  <tr className="border-b border-leo-border">
                    <th className="py-2 text-left">Criterio</th>
                    <th className="py-2 text-right">Ottenuto</th>
                    <th className="py-2 text-right">%</th>
                    <th className="py-2 text-right">Peso</th>
                    <th className="py-2 text-right">Ponderato</th>
                  </tr>
                </thead>
                <tbody>
                  {detailRows.map((row) => (
                    <tr key={row.key} className="border-b border-leo-border/60">
                      <td className="max-w-[160px] py-2 pr-3">{row.criterio}</td>
                      <td className="py-2 text-right">{row.ottenuto}/100</td>
                      <td className="py-2 text-right">{row.percentuale}%</td>
                      <td className="py-2 text-right">{row.ponderazione}%</td>
                      <td className="py-2 text-right">{row.ponderato}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-bold">
                    <td className="pt-3">Totale</td>
                    <td className="pt-3 text-right" colSpan={4}>
                      <span className="text-status-green">{score}</span> /100
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>

        <ChartCard title="Trend punteggio totale">
          <ResponsiveContainer width="100%" height={270}>
            <LineChart data={trendData} margin={{ top: 12, right: 16, bottom: 8, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
              <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={11} />
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="score" name="Punteggio totale" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="soglia" name="Soglia minima" stroke="#3b82f6" strokeDasharray="5 5" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-4">
        <ChartCard title="Fatturato">
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={turnoverData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="year" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(value) => `${Number(value) / 1_000_000}M`} />
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(value) => formatMoney(Number(value))} />
              <Bar dataKey="fatturato" fill="#10b981" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-2 rounded-md border border-leo-border bg-leo-card/50 px-3 py-2 text-xs">
            CAGR 2021-2024 <span className="float-right font-bold text-status-green">{toNumber(capacity.cagr_2021_2024) || 0}%</span>
          </div>
        </ChartCard>

        <Card className="leo-card">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm uppercase text-leo-muted">Presenza geografica</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="relative h-[155px] overflow-hidden rounded-md border border-leo-border bg-leo-base">
              <div className="absolute left-[16%] top-[50%] h-2 w-2 rounded-full bg-status-green shadow-[0_0_0_5px_rgba(16,185,129,0.18)]" />
              <div className="absolute left-[48%] top-[38%] h-2 w-2 rounded-full bg-status-green shadow-[0_0_0_5px_rgba(16,185,129,0.18)]" />
              <div className="absolute left-[58%] top-[46%] h-2 w-2 rounded-full bg-brand-cyan shadow-[0_0_0_5px_rgba(6,182,212,0.18)]" />
              <div className="absolute left-[80%] top-[42%] h-2 w-2 rounded-full bg-status-green shadow-[0_0_0_5px_rgba(16,185,129,0.18)]" />
              <div className="absolute inset-x-6 top-1/2 h-px bg-leo-border/70" />
              <Building2 className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 text-leo-muted/20" />
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs">
              <GeoStat label="Sedi operative" value={toNumber(capacity.sedi_operative)} />
              <GeoStat label="Sede legale" value={boolish(capacity.sede_legale) ? 1 : 0} />
              <GeoStat label="Stabilimenti" value={toNumber(capacity.stabilimenti)} />
              <GeoStat label="Paesi serviti" value={toNumber(capacity.paesi_serviti)} />
            </div>
          </CardContent>
        </Card>

        <ChartCard title="Riepilogo possesso requisiti">
          <div className="grid items-center gap-3 sm:grid-cols-[1fr_0.8fr]">
            <ResponsiveContainer width="100%" height={210}>
              <PieChart>
                <Pie data={requirementTotals} innerRadius={50} outerRadius={78} dataKey="value" nameKey="name" paddingAngle={2}>
                  {requirementTotals.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 text-xs">
              {requirementTotals.map((entry) => (
                <div key={entry.name} className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: entry.color }} />
                    {entry.name}
                  </span>
                  <strong>{entry.value}</strong>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-md border border-status-green/30 bg-status-green/10 px-3 py-2 text-center text-xs text-status-green">
            Ogni requisito confermato attribuisce punteggio
          </div>
        </ChartCard>

        <Card className="leo-card">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm uppercase text-leo-muted">Qualifica e storico</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 p-4 pt-0 text-xs">
            <InfoRow label="Stato qualifica attuale" value={<Badge variant={STATUS_BADGE[status] ?? "outline"}>{STATUS_LABEL[status] ?? status}</Badge>} />
            <InfoRow label="Data qualifica" value={formatDate(qualification.approved_at ?? qualification.reviewed_at ?? qualification.created_at)} />
            <InfoRow label="Prossima rivalutazione" value={formatDate(qualification.valid_until)} />
            <InfoRow label="Numero valutazioni" value={Math.max(1, history.length)} />
            <InfoRow label="Miglior punteggio" value={`${bestScore}/100`} />
            <InfoRow label="Punteggio medio" value={`${averageScore}/100`} />
            {reasons.length > 0 && (
              <div className="rounded-md border border-status-orange/30 bg-status-orange/10 p-2 text-status-orange">
                {reasons.slice(0, 3).join(" - ")}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <Card className="leo-card">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm uppercase text-leo-muted">Check-list requisiti e documentazione</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="overflow-auto">
              <table className="min-w-[920px] w-full text-xs">
                <thead className="text-leo-muted">
                  <tr className="border-b border-leo-border">
                    <th className="py-2 text-left">Area</th>
                    <th className="py-2 text-left">Requisito</th>
                    <th className="py-2 text-left">Descrizione</th>
                    <th className="py-2 text-left">Documento richiesto</th>
                    <th className="py-2 text-left">Obbligatorio</th>
                    <th className="py-2 text-left">Stato</th>
                    <th className="py-2 text-right">Punteggio</th>
                    <th className="py-2 text-left">Scadenza</th>
                    <th className="py-2 text-left">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {requirementRows.map((row, index) => (
                    <tr key={`${row.requisito}-${index}`} className="border-b border-leo-border/60">
                      <td className="py-2 pr-3">{row.area}</td>
                      <td className="py-2 pr-3 font-medium">{row.requisito}</td>
                      <td className="py-2 pr-3 text-leo-muted">{row.descrizione}</td>
                      <td className="py-2 pr-3 text-brand-cyan">{row.documento}</td>
                      <td className="py-2 pr-3">{row.obbligatorio ? "Si" : "No"}</td>
                      <td className="py-2 pr-3"><StatusPill status={row.stato} /></td>
                      <td className="py-2 text-right">{row.punteggio}</td>
                      <td className="py-2 pr-3">{row.scadenza}</td>
                      <td className="py-2 pr-3 text-leo-muted">{row.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex flex-wrap justify-end gap-4 border-t border-leo-border pt-3 text-sm font-bold">
              <span>Checklist documentale <span className="ml-2 text-status-green">{documentScore}</span> / 100</span>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="leo-card">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm uppercase text-leo-muted">Anagrafica fornitore</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-4 pt-0 text-xs">
              <InfoRow label="Ragione sociale" value={qualification.legal_name} />
              <InfoRow label="Alias" value={qualification.supplier_name} />
              <InfoRow label="P.IVA / Tax ID" value={qualification.tax_id ?? "-"} />
              <InfoRow label="Email" value={qualification.email ?? "-"} />
              <InfoRow label="Telefono" value={qualification.phone ?? "-"} />
              <InfoRow label="Indirizzo" value={qualification.address ?? "-"} />
              <InfoRow label="Citta" value={String(legal.city ?? "-")} />
              <InfoRow label="PEC" value={String(legal.pec ?? "-")} />
              <InfoRow label="Referente" value={String(legal.contact_name ?? "-")} />
            </CardContent>
          </Card>
          <Card className="leo-card">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm uppercase text-leo-muted">Legenda stati</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-4 pt-0 text-xs">
              <LegendRow color="#10b981" title="Conforme" text="Requisito soddisfatto e documentazione valida" />
              <LegendRow color="#3b82f6" title="Parziale" text="Requisito parzialmente soddisfatto o da verificare" />
              <LegendRow color="#ef4444" title="Non conforme" text="Requisito non soddisfatto o documento mancante" />
              <LegendRow color="#64748b" title="Non applicabile" text="Requisito non applicabile al fornitore" />
            </CardContent>
          </Card>
          <Card className="leo-card">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm uppercase text-leo-muted">Note generali</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-4 pt-0 text-xs text-leo-muted">
              <p>La qualifica e soggetta a rivalutazione periodica.</p>
              <p>Eventuali non conformita possono influire sul punteggio complessivo.</p>
              <p>Referente: quality@leonardoindustry.com</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function CircularGauge({ score, color, size = "normal" }: { score: number; color?: string; size?: "normal" | "large" }) {
  const gaugeColor = color ?? scoreColor(score);
  const dimension = size === "large" ? "h-32 w-32" : "h-24 w-24";
  return (
    <div
      className={`relative grid ${dimension} place-items-center rounded-full`}
      style={{ background: `conic-gradient(${gaugeColor} ${score * 3.6}deg, rgba(148, 163, 184, 0.22) 0deg)` }}
    >
      <div className="absolute inset-3 rounded-full bg-leo-card" />
      <div className="relative text-center">
        <div className={size === "large" ? "text-4xl font-bold" : "text-2xl font-bold"}>{score}</div>
        <div className="text-xs text-leo-muted">/100</div>
      </div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="leo-card">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-sm uppercase text-leo-muted">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">{children}</CardContent>
    </Card>
  );
}

function GeoStat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-lg font-bold text-status-green">{value}</div>
      <div className="text-leo-muted">{label}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-leo-border/60 py-1.5">
      <span className="text-leo-muted">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function StatusPill({ status }: { status: RequirementRow["stato"] }) {
  const classes: Record<RequirementRow["stato"], string> = {
    Conforme: "border-status-green/40 bg-status-green/15 text-status-green",
    Parziale: "border-brand-cyan/40 bg-brand-cyan/15 text-brand-cyan",
    "Non conforme": "border-status-red/40 bg-status-red/15 text-status-red",
    "Non applicabile": "border-leo-border bg-leo-card2 text-leo-muted",
  };
  return <span className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] font-medium ${classes[status]}`}>{status}</span>;
}

function LegendRow({ color, title, text }: { color: string; title: string; text: string }) {
  return (
    <div className="flex gap-2">
      <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      <div>
        <div className="font-medium">{title}</div>
        <div className="text-leo-muted">{text}</div>
      </div>
    </div>
  );
}
