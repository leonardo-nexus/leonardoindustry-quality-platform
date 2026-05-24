// Calcolo indice qualità 0-100 secondo specifica Quality Sentinel
// Pesi:
//  - Checklist completate correttamente: 20
//  - Puntualità task e controlli: 15
//  - Documenti completi e congruenti: 20
//  - NC chiuse nei tempi e con efficacia: 15
//  - Evidenze live valide: 15
//  - Assenza blocchi operativi: 10
//  - Audit e follow-up regolari: 5

export interface QualityScoreInput {
  checklist_total: number;
  checklist_completed: number;
  checklist_overdue: number;
  tasks_total: number;
  tasks_on_time: number;
  tasks_overdue: number;
  documents_required: number;
  documents_ok: number;
  documents_missing: number;
  documents_expired: number;
  nc_total: number;
  nc_closed_effective: number;
  nc_critical_open: number;
  evidence_total: number;
  evidence_valid: number;
  blocks_open: number;
  audits_planned: number;
  audits_executed: number;
}

export interface QualityScoreOutput {
  score: number; // 0-100
  level: "eccellente" | "buono" | "attenzione" | "critico" | "fuori_controllo";
  components: Record<string, number>;
  penalties: { code: string; impact: number; reason: string }[];
}

function pct(a: number, b: number) {
  return b > 0 ? (a / b) * 100 : 100;
}

export function computeQualityScore(i: QualityScoreInput): QualityScoreOutput {
  // Componenti pesati
  const c_checklist = (pct(i.checklist_completed, i.checklist_total) * 20) / 100;
  const c_puntualita = (pct(i.tasks_on_time, i.tasks_total) * 15) / 100;
  const c_documenti = (pct(i.documents_ok, i.documents_required) * 20) / 100;
  const c_nc = (pct(i.nc_closed_effective, i.nc_total) * 15) / 100;
  const c_evidenze = (pct(i.evidence_valid, i.evidence_total) * 15) / 100;
  const c_blocchi = i.blocks_open === 0 ? 10 : Math.max(0, 10 - i.blocks_open * 2);
  const c_audit = (pct(i.audits_executed, i.audits_planned) * 5) / 100;

  let score = c_checklist + c_puntualita + c_documenti + c_nc + c_evidenze + c_blocchi + c_audit;

  // Penalizzazioni
  const penalties: QualityScoreOutput["penalties"] = [];
  if (i.documents_expired > 0) {
    const p = Math.min(10, i.documents_expired * 2);
    penalties.push({ code: "DOC_EXPIRED", impact: -p, reason: `${i.documents_expired} documenti scaduti` });
    score -= p;
  }
  if (i.tasks_overdue > 0) {
    const p = Math.min(8, i.tasks_overdue * 2);
    penalties.push({ code: "TASK_OVERDUE", impact: -p, reason: `${i.tasks_overdue} task scaduti` });
    score -= p;
  }
  if (i.nc_critical_open > 0) {
    const p = Math.min(15, i.nc_critical_open * 5);
    penalties.push({ code: "NC_CRITICAL_OPEN", impact: -p, reason: `${i.nc_critical_open} NC critiche aperte` });
    score -= p;
  }
  if (i.documents_missing > 0) {
    const p = Math.min(10, i.documents_missing * 2);
    penalties.push({ code: "DOC_MISSING", impact: -p, reason: `${i.documents_missing} documenti mancanti` });
    score -= p;
  }

  score = Math.max(0, Math.min(100, score));

  const level: QualityScoreOutput["level"] =
    score >= 90 ? "eccellente"
    : score >= 75 ? "buono"
    : score >= 60 ? "attenzione"
    : score >= 40 ? "critico"
    : "fuori_controllo";

  return {
    score: Math.round(score * 10) / 10,
    level,
    components: {
      checklist: Math.round(c_checklist * 10) / 10,
      puntualita: Math.round(c_puntualita * 10) / 10,
      documenti: Math.round(c_documenti * 10) / 10,
      nc: Math.round(c_nc * 10) / 10,
      evidenze: Math.round(c_evidenze * 10) / 10,
      blocchi: Math.round(c_blocchi * 10) / 10,
      audit: Math.round(c_audit * 10) / 10,
    },
    penalties,
  };
}

export const SCORE_LEVEL_TONE: Record<QualityScoreOutput["level"], { color: string; bg: string; label: string }> = {
  eccellente: { color: "text-status-green", bg: "bg-status-green/10 border-status-green/40", label: "Eccellente" },
  buono: { color: "text-brand-cyan", bg: "bg-brand-cyan/10 border-brand-cyan/40", label: "Buono" },
  attenzione: { color: "text-status-yellow", bg: "bg-status-yellow/10 border-status-yellow/40", label: "Attenzione" },
  critico: { color: "text-status-orange", bg: "bg-status-orange/10 border-status-orange/40", label: "Critico" },
  fuori_controllo: { color: "text-status-red", bg: "bg-status-red/10 border-status-red/40", label: "Fuori controllo" },
};
