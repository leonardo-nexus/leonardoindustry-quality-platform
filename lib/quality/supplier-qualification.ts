import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { writeAuditLog } from "@/lib/audit/audit-log";

/**
 * Pesi score qualifica fornitore (specifica FMT-FOR-01).
 * Totale = 100.
 */
export const SCORE_WEIGHTS = {
  documenti: 20,
  qualita: 15,
  sicurezza: 10,
  ambiente: 10,
  legale: 15,
  tecnica_economica: 15,
  affidabilita: 15,
} as const;

export interface QualificationScoreInput {
  legal_compliance?: any;
  certifications?: any;
  quality_data?: any;
  safety_data?: any;
  environment_data?: any;
  capacity_data?: any;
  reliability_data?: any;
  documents_uploaded?: number;
  documents_required?: number;
}

/** Calcola score 0-100 + breakdown per ognuno dei 7 macro-blocchi */
export function computeQualificationScore(input: QualificationScoreInput): { score: number; level: string; breakdown: Record<string, number>; reasons: string[] } {
  const breakdown: Record<string, number> = {};
  const reasons: string[] = [];

  // Documenti (20)
  const docReq = input.documents_required ?? 5;
  const docUp = Math.min(input.documents_uploaded ?? 0, docReq);
  breakdown.documenti = Math.round(SCORE_WEIGHTS.documenti * (docUp / docReq));
  if (docUp < docReq) reasons.push(`Documenti caricati ${docUp}/${docReq}`);

  // Legale (15) - 3 punti per ogni campo true (cciaa/durc/rct_rco/antimafia/fiscale)
  const legal = input.legal_compliance ?? {};
  const legalScore = ["cciaa_valid", "durc_valid", "rct_rco_valid", "fiscale_ok"].filter(k => legal[k] === true).length;
  breakdown.legale = Math.round(SCORE_WEIGHTS.legale * (legalScore / 4));
  if (legalScore < 4) reasons.push(`Conformità legale ${legalScore}/4`);

  // Certificazioni → Qualità (15) + Sicurezza (10) + Ambiente (10)
  const certs = input.certifications ?? {};
  breakdown.qualita = certs.iso_9001 ? SCORE_WEIGHTS.qualita : Math.round(SCORE_WEIGHTS.qualita * 0.3);
  breakdown.sicurezza = certs.iso_45001 ? SCORE_WEIGHTS.sicurezza : Math.round(SCORE_WEIGHTS.sicurezza * 0.4);
  breakdown.ambiente = certs.iso_14001 ? SCORE_WEIGHTS.ambiente : Math.round(SCORE_WEIGHTS.ambiente * 0.4);
  if (!certs.iso_9001) reasons.push("ISO 9001 mancante");
  if (!certs.iso_45001) reasons.push("ISO 45001 mancante");

  // Capacità tecnica/economica (15) — bonus se anni>5, dipendenti>10, fatturato>1M
  const cap = input.capacity_data ?? {};
  let capScore = 0;
  if ((cap.anni_attivita ?? 0) >= 5) capScore += 5;
  if ((cap.dipendenti ?? 0) >= 10) capScore += 5;
  if ((cap.fatturato_annuo ?? 0) >= 1_000_000) capScore += 5;
  breakdown.tecnica_economica = capScore;
  if (capScore < 10) reasons.push("Capacità tecnico-economica limitata");

  // Affidabilità (15) — penalty da ritardi/contestazioni/NC/deroghe
  const rel = input.reliability_data ?? {};
  const punctuality = (rel.consegne_puntuali_pct ?? 90) / 100;
  let relScore = Math.round(SCORE_WEIGHTS.affidabilita * punctuality);
  relScore -= Math.min(5, (rel.nc_aperte ?? 0));
  relScore -= Math.min(5, (rel.deroghe_firmate ?? 0));
  relScore -= Math.min(3, (rel.consegne_non_autorizzate ?? 0));
  breakdown.affidabilita = Math.max(0, relScore);

  const score = Math.max(0, Math.min(100,
    breakdown.documenti + breakdown.qualita + breakdown.sicurezza + breakdown.ambiente +
    breakdown.legale + breakdown.tecnica_economica + breakdown.affidabilita
  ));

  let level = "not_qualified";
  if (score >= 90) level = "qualified_excellent";
  else if (score >= 75) level = "qualified";
  else if (score >= 60) level = "qualified_with_reserve";
  else if (score >= 40) level = "suspended";

  return { score, level, breakdown, reasons };
}

/**
 * Crea evento sync_outbox per push verso ERP.
 */
export async function enqueueSyncEvent(opts: {
  entity_type: string;
  entity_id: string;
  global_id?: string | null;
  action: string;
  payload: Record<string, unknown>;
}) {
  const admin = createServiceRoleClient();
  const idempotency_key = `${opts.entity_type}:${opts.entity_id}:${opts.action}:${Date.now()}`;
  await admin.from("sync_outbox").insert({
    entity_type: opts.entity_type,
    entity_id: opts.entity_id,
    global_id: opts.global_id ?? null,
    action: opts.action,
    payload: opts.payload,
    idempotency_key,
  });
}

/**
 * Aggiorna qualifica + score + blocco ordini + enqueue sync.
 */
export async function saveQualificationAction(qualificationId: string, patch: Record<string, unknown>) {
  const admin = createServiceRoleClient();

  const { data: prev } = await admin.from("supplier_qualification").select("*").eq("id", qualificationId).maybeSingle();
  if (!prev) return { error: "Qualifica non trovata" };

  const merged = { ...prev, ...patch };
  // ricalcola score se hai dati nuovi
  const { data: docs } = await admin.from("qualification_document").select("uploaded").eq("qualification_id", qualificationId);
  const documentsUploaded = (docs ?? []).filter((d) => d.uploaded).length;
  const documentsRequired = (docs ?? []).length || 5;

  const scoreResult = computeQualificationScore({
    legal_compliance: merged.legal_compliance,
    certifications: merged.certifications,
    quality_data: merged.quality_data,
    safety_data: merged.safety_data,
    environment_data: merged.environment_data,
    capacity_data: merged.capacity_data,
    reliability_data: merged.reliability_data,
    documents_uploaded: documentsUploaded,
    documents_required: documentsRequired,
  });

  const blocked_for_orders = scoreResult.score < (merged.minimum_threshold ?? 60) ||
                              scoreResult.level === "not_qualified" ||
                              scoreResult.level === "suspended" ||
                              (merged.valid_until && new Date(merged.valid_until) < new Date());

  const updates: Record<string, unknown> = {
    ...patch,
    score: scoreResult.score,
    score_breakdown: scoreResult.breakdown,
    qualification_status: scoreResult.level,
    blocked_for_orders,
    block_reasons: scoreResult.reasons,
    sync_status: "pending",
    last_synced_at: null,
    updated_at: new Date().toISOString(),
  };

  const { data: updated, error } = await admin
    .from("supplier_qualification")
    .update(updates)
    .eq("id", qualificationId)
    .select("*")
    .single();
  if (error || !updated) return { error: error?.message ?? "Update fallito" };

  // Audit + outbox
  await writeAuditLog({
    entity_type: "supplier_qualification",
    entity_id: qualificationId,
    action: "update",
    old_values: prev,
    new_values: updates,
    reason_type: "qualification_change",
  });

  await enqueueSyncEvent({
    entity_type: "supplier_qualification",
    entity_id: qualificationId,
    global_id: updated.global_id,
    action: blocked_for_orders && !prev.blocked_for_orders ? "supplier_qualification.blocked" : "supplier_qualification.updated",
    payload: {
      supplier_global_id: updated.global_id,
      qualification_status: scoreResult.level,
      score: scoreResult.score,
      blocked_for_orders,
      block_reasons: scoreResult.reasons,
      valid_until: updated.valid_until,
      last_updated_at: new Date().toISOString(),
    },
  });

  return { ok: true, score: scoreResult.score, level: scoreResult.level, blocked_for_orders };
}
