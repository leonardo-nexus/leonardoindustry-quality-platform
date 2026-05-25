import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { writeAuditLog } from "@/lib/audit/audit-log";
import {
  computeQualificationScore,
  QUALIFICATION_CATEGORIES,
  SCORE_WEIGHTS,
  type QualificationScoreInput,
} from "@/lib/quality/supplier-qualification-scoring";

export {
  computeQualificationScore,
  QUALIFICATION_CATEGORIES,
  SCORE_WEIGHTS,
  type QualificationScoreInput,
};

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
  const { data: docs } = await admin
    .from("qualification_document")
    .select("document_type, uploaded, verified")
    .eq("qualification_id", qualificationId);
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
    production_delivery: merged.production_delivery,
    documents_uploaded: documentsUploaded,
    documents_required: documentsRequired,
    documents: docs ?? [],
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
