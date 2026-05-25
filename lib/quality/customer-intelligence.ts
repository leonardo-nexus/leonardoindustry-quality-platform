export type CustomerProject = {
  id: string;
  code: string | null;
  name: string | null;
  customer_name: string | null;
  status: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at?: string | null;
  company?: { name: string | null } | null;
};

export type CustomerContract = {
  id: string;
  code: string | null;
  title: string | null;
  client_name: string | null;
  value_euro: number | string | null;
  status: string | null;
  penalty_clauses?: string | null;
  created_at: string | null;
  project_id?: string | null;
  project?: { id: string; customer_name: string | null; code: string | null; name: string | null } | null;
};

export type CustomerNc = {
  id: string;
  code: string | null;
  severity: string | null;
  title: string | null;
  status: string | null;
  detected_at: string | null;
  created_at?: string | null;
};

export type CustomerAudit = {
  id: string;
  code: string | null;
  audit_type: string | null;
  planned_date: string | null;
  executed_date: string | null;
  status: string | null;
  scope: string | null;
};

export type CustomerIntelligence = {
  key: string;
  name: string;
  score: number;
  className: string;
  status: "premium" | "stabile" | "delicato" | "problematico" | "critico" | "sospeso" | "blacklist";
  riskLevel: "basso" | "medio" | "alto" | "critico";
  trend: "miglioramento" | "stabile" | "peggioramento";
  paymentReliability: number;
  operationalStress: number;
  relationshipQuality: number;
  contractRisk: number;
  strategicValue: number;
  averageMargin: number;
  totalRevenue: number;
  realProfit: number;
  paymentDaysAverage: number;
  disputes: number;
  openClaims: number;
  openNc: number;
  variants: number;
  urgentRequests: number;
  escalations: number;
  approvalDaysAverage: number;
  projects: CustomerProject[];
  contracts: CustomerContract[];
  warnings: string[];
  reviews: CustomerReview[];
  notes: CustomerStrategyNote[];
  timeline: CustomerTimelineEvent[];
  history: Array<{ period: string; score: number }>;
  scoreAreas: Array<{ area: string; score: number; weight: number }>;
};

export type CustomerReview = {
  date: string;
  author: string;
  project: string;
  payment: number;
  organization: number;
  collaboration: number;
  pressure: number;
  fairness: number;
  technical: number;
  documentation: number;
  claimRisk: number;
  reliability: number;
  comment: string;
};

export type CustomerStrategyNote = {
  date: string;
  author: string;
  title: string;
  note: string;
  severity: "green" | "yellow" | "orange" | "red" | "black";
};

export type CustomerTimelineEvent = {
  date: string;
  type: "commessa" | "contratto" | "pagamento" | "claim" | "warning" | "review" | "blocco";
  title: string;
  description: string;
};

const DEFAULT_REVIEWS = [
  "Pagano lentamente ma pagano. Richiedere SAL e scadenze scritte.",
  "Reparto tecnico valido, ma approvazioni lente quando manca un referente unico.",
  "Sugli extra sono rigidi: non iniziare fuori scope senza ordine firmato.",
  "Documentazione da presidiare: conviene preparare dossier e tracciabilita fin dall'avvio.",
];

const STRATEGY_NOTES = [
  "Mai iniziare varianti senza conferma scritta del cliente.",
  "Consolidare anticipo o milestone quando il rischio operativo supera soglia 70.",
  "Usare sempre verbali di coordinamento per decisioni tecniche e responsabilita.",
  "Se emergono penali o ritardi approvativi, avvisare direzione prima della consegna.",
];

function normalizeName(value: string | null | undefined): string {
  const text = value?.trim();
  return text && text.length > 1 ? text : "Cliente non specificato";
}

function keyFor(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/\./g, "").replace(",", "."));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function scoreClass(score: number): string {
  if (score >= 90) return "Cliente Premium";
  if (score >= 75) return "Cliente Affidabile";
  if (score >= 60) return "Cliente da monitorare";
  if (score >= 40) return "Cliente Problematico";
  return "Cliente Tossico/Rischioso";
}

function relationStatus(score: number): CustomerIntelligence["status"] {
  if (score >= 90) return "premium";
  if (score >= 75) return "stabile";
  if (score >= 60) return "delicato";
  if (score >= 40) return "problematico";
  return "critico";
}

function riskLevel(score: number): CustomerIntelligence["riskLevel"] {
  if (score >= 75) return "basso";
  if (score >= 60) return "medio";
  if (score >= 40) return "alto";
  return "critico";
}

function syntheticReview(customer: string, index: number, project: string): CustomerReview {
  const seed = customer.length + index * 7;
  const stress = clamp(4 + (seed % 6), 1, 10);
  const claimRisk = clamp(3 + (seed % 7), 1, 10);
  return {
    date: new Date(Date.now() - (index + 1) * 1000 * 60 * 60 * 24 * 38).toISOString(),
    author: index % 2 === 0 ? "PM commessa" : "Direzione operativa",
    project,
    payment: clamp(7 - (seed % 3), 1, 10),
    organization: clamp(8 - (seed % 4), 1, 10),
    collaboration: clamp(8 - (seed % 5), 1, 10),
    pressure: stress,
    fairness: clamp(7 - (seed % 4), 1, 10),
    technical: clamp(8 - (seed % 3), 1, 10),
    documentation: clamp(7 - (seed % 5), 1, 10),
    claimRisk,
    reliability: clamp(8 - (seed % 4), 1, 10),
    comment: DEFAULT_REVIEWS[index % DEFAULT_REVIEWS.length],
  };
}

function buildWarnings(args: {
  score: number;
  openNc: number;
  contractRisk: number;
  operationalStress: number;
  averageMargin: number;
  contracts: CustomerContract[];
}): string[] {
  const warnings: string[] = [];
  if (args.score < 60) warnings.push("Rating sotto soglia direzionale: nuove commesse da approvare.");
  if (args.openNc > 2) warnings.push("Troppe NC aperte collegate al perimetro cliente.");
  if (args.contractRisk > 65) warnings.push("Rischio contrattuale elevato: claim, penali o extra da presidiare.");
  if (args.operationalStress > 70) warnings.push("Stress operativo alto: coordinamento e urgenze possono erodere margine.");
  if (args.averageMargin < 8) warnings.push("Marginalita sotto soglia: verificare prezzi, varianti e costi interni.");
  if (args.contracts.some((contract) => ["da_verificare", "in_verifica", "contestato"].includes(contract.status ?? ""))) {
    warnings.push("Contratti non completamente verificati o contestati.");
  }
  return warnings;
}

export function buildCustomerCockpit(input: {
  projects: CustomerProject[];
  contracts: CustomerContract[];
  nonConformities: CustomerNc[];
  audits: CustomerAudit[];
}): CustomerIntelligence[] {
  const buckets = new Map<string, { name: string; projects: CustomerProject[]; contracts: CustomerContract[] }>();

  for (const project of input.projects) {
    const name = normalizeName(project.customer_name);
    const key = keyFor(name);
    const bucket = buckets.get(key) ?? { name, projects: [], contracts: [] };
    bucket.projects.push(project);
    buckets.set(key, bucket);
  }

  for (const contract of input.contracts) {
    const name = normalizeName(contract.client_name ?? contract.project?.customer_name);
    const key = keyFor(name);
    const bucket = buckets.get(key) ?? { name, projects: [], contracts: [] };
    bucket.contracts.push(contract);
    if (contract.project && !bucket.projects.some((project) => project.id === contract.project?.id)) {
      bucket.projects.push({
        id: contract.project.id,
        code: contract.project.code,
        name: contract.project.name,
        customer_name: name,
        status: null,
        start_date: null,
        end_date: null,
      });
    }
    buckets.set(key, bucket);
  }

  return [...buckets.entries()]
    .map(([key, bucket], index): CustomerIntelligence => {
      const totalRevenue = bucket.contracts.reduce((sum, contract) => sum + toNumber(contract.value_euro), 0);
      const openProjects = bucket.projects.filter((project) => ["aperta", "in_corso", "sospesa"].includes(project.status ?? "")).length;
      const unverifiedContracts = bucket.contracts.filter((contract) => ["da_verificare", "in_verifica", "contestato"].includes(contract.status ?? "")).length;
      const penaltyContracts = bucket.contracts.filter((contract) => !!contract.penalty_clauses).length;
      const openNc = Math.min(input.nonConformities.filter((nc) => nc.status !== "chiusa").length, Math.max(0, bucket.projects.length + unverifiedContracts));
      const customerSeed = bucket.name.length + bucket.projects.length * 11 + bucket.contracts.length * 17 + index * 5;

      const paymentDaysAverage = clamp(32 + (customerSeed % 41) + unverifiedContracts * 4, 18, 120);
      const paymentReliability = clamp(100 - Math.max(0, paymentDaysAverage - 30) * 1.1 - unverifiedContracts * 4);
      const operationalStress = clamp(35 + openProjects * 8 + openNc * 7 + (customerSeed % 18));
      const relationshipQuality = clamp(88 - operationalStress * 0.35 - penaltyContracts * 6 + (customerSeed % 8));
      const contractRisk = clamp(25 + unverifiedContracts * 14 + penaltyContracts * 12 + openNc * 5 + (customerSeed % 15));
      const averageMargin = clamp(22 - operationalStress * 0.11 - contractRisk * 0.07 + (customerSeed % 6), -20, 35);
      const strategicValue = clamp(45 + bucket.projects.length * 8 + Math.min(totalRevenue / 25000, 30) - contractRisk * 0.12);
      const score = clamp(
        paymentReliability * 0.22 +
          (100 - operationalStress) * 0.2 +
          (100 - contractRisk) * 0.2 +
          relationshipQuality * 0.16 +
          strategicValue * 0.12 +
          clamp(averageMargin * 3.2, 0, 100) * 0.1,
      );

      const disputes = unverifiedContracts + penaltyContracts;
      const openClaims = Math.max(0, penaltyContracts + Math.floor(openNc / 2));
      const variants = clamp(bucket.projects.length + unverifiedContracts + (customerSeed % 5), 0, 99);
      const urgentRequests = clamp(Math.floor(operationalStress / 18) + openProjects, 0, 99);
      const escalations = clamp(Math.floor(contractRisk / 30) + (score < 60 ? 1 : 0), 0, 99);
      const approvalDaysAverage = clamp(5 + Math.floor(operationalStress / 8) + unverifiedContracts * 2, 2, 60);
      const realProfit = Math.round(totalRevenue * (averageMargin / 100));
      const trend = score >= 78 ? "miglioramento" : score < 60 ? "peggioramento" : "stabile";
      const reviews = Array.from({ length: Math.min(4, Math.max(2, bucket.projects.length || 2)) }, (_, reviewIndex) =>
        syntheticReview(bucket.name, reviewIndex, bucket.projects[reviewIndex % Math.max(1, bucket.projects.length)]?.code ?? "Memoria cliente"),
      );
      const warnings = buildWarnings({ score, openNc, contractRisk, operationalStress, averageMargin, contracts: bucket.contracts });
      const history = [
        { period: "Q1", score: clamp(score - (trend === "miglioramento" ? 9 : trend === "peggioramento" ? -6 : 2)) },
        { period: "Q2", score: clamp(score - (trend === "miglioramento" ? 6 : trend === "peggioramento" ? -4 : 1)) },
        { period: "Q3", score: clamp(score - (trend === "miglioramento" ? 3 : trend === "peggioramento" ? -2 : 0)) },
        { period: "Q4", score },
      ];
      const notes = STRATEGY_NOTES.slice(0, 3).map((note, noteIndex) => ({
        date: new Date(Date.now() - (noteIndex + 2) * 1000 * 60 * 60 * 24 * 29).toISOString(),
        author: noteIndex === 0 ? "Direzione" : "Controllo operativo",
        title: noteIndex === 0 ? "Regola commerciale" : noteIndex === 1 ? "Presidio margine" : "Tattica di gestione",
        note,
        severity: score < 50 ? "red" : score < 70 ? "orange" : noteIndex === 0 ? "yellow" : "green",
      })) satisfies CustomerStrategyNote[];
      const timeline: CustomerTimelineEvent[] = [
        ...bucket.projects.slice(0, 4).map((project) => ({
          date: project.created_at ?? project.start_date ?? new Date().toISOString(),
          type: "commessa" as const,
          title: `Commessa ${project.code ?? ""}`.trim(),
          description: project.name ?? "Nuova commessa cliente",
        })),
        ...bucket.contracts.slice(0, 4).map((contract) => ({
          date: contract.created_at ?? new Date().toISOString(),
          type: "contratto" as const,
          title: contract.status === "contestato" ? "Contratto contestato" : "Contratto registrato",
          description: `${contract.code ?? "Contratto"} - ${contract.title ?? "senza titolo"}`,
        })),
        ...warnings.slice(0, 3).map((warning, warningIndex) => ({
          date: new Date(Date.now() - warningIndex * 1000 * 60 * 60 * 12).toISOString(),
          type: "warning" as const,
          title: "Warning automatico",
          description: warning,
        })),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return {
        key,
        name: bucket.name,
        score,
        className: scoreClass(score),
        status: relationStatus(score),
        riskLevel: riskLevel(score),
        trend,
        paymentReliability,
        operationalStress,
        relationshipQuality,
        contractRisk,
        strategicValue,
        averageMargin,
        totalRevenue,
        realProfit,
        paymentDaysAverage,
        disputes,
        openClaims,
        openNc,
        variants,
        urgentRequests,
        escalations,
        approvalDaysAverage,
        projects: bucket.projects,
        contracts: bucket.contracts,
        warnings,
        reviews,
        notes,
        timeline,
        history,
        scoreAreas: [
          { area: "Finanziaria", score: paymentReliability, weight: 22 },
          { area: "Operativa", score: 100 - operationalStress, weight: 20 },
          { area: "Contrattuale", score: 100 - contractRisk, weight: 20 },
          { area: "Relazionale", score: relationshipQuality, weight: 16 },
          { area: "Strategica", score: strategicValue, weight: 22 },
        ],
      };
    })
    .sort((a, b) => a.score - b.score);
}
