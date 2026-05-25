import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { writeAuditLog } from "@/lib/audit/audit-log";

export type CongruenceStatus = "coerente" | "non_congruente" | "da_verificare";
export type RoutingStatus = "routed" | "quarantena" | "manual_review";

type OcrExtractionRow = {
  id: string;
  company_id: string | null;
  status?: string | null;
  doc_type?: string | null;
  confidence_score?: number | null;
  source_entity_type?: string | null;
  source_entity_id?: string | null;
  extracted_fields?: Record<string, unknown> | null;
};

type MaterialReceptionRow = Record<string, unknown> & {
  id: string;
  company_id: string;
  project_id?: string | null;
  reception_code?: string | null;
  count_matches?: boolean | null;
  destination_matches?: boolean | null;
  photo_bolla_id?: string | null;
  photo_colli_id?: string | null;
  photo_etichetta_id?: string | null;
  photo_materiale_id?: string | null;
};

export async function processOcrQueueItem(documentId: string) {
  const admin = createServiceRoleClient();
  const { data: itemData, error } = await admin
    .from("ocr_extraction")
    .select("id, company_id, status, doc_type, confidence_score, source_entity_type, source_entity_id, extracted_fields")
    .eq("id", documentId)
    .maybeSingle();

  if (error || !itemData) return { error: error?.message ?? "Documento OCR non trovato" };
  const item = itemData as OcrExtractionRow;

  const currentFields = item.extracted_fields ?? {};
  const confidence = Number(item.confidence_score ?? 0);
  const nextStatus = confidence > 0 && confidence < 70 ? "low_confidence" : "processato";
  const extractedFields = {
    ...currentFields,
    ocr_engine: currentFields.ocr_engine ?? "manual_assisted",
    operational_status: nextStatus === "low_confidence" ? "low_confidence" : "ocr_completed",
    processed_by_engine_at: new Date().toISOString(),
  };

  await admin
    .from("ocr_extraction")
    .update({
      status: nextStatus,
      processed_at: new Date().toISOString(),
      extracted_fields: extractedFields,
    })
    .eq("id", documentId);

  await admin.from("quality_event_log").insert({
    company_id: item.company_id ?? null,
    source_type: "ocr_extraction",
    source_id: documentId,
    event_type: "ocr_processed",
    severity: nextStatus === "low_confidence" ? "alert" : "info",
    message: nextStatus === "low_confidence" ? "OCR completato con bassa confidenza" : "OCR completato e pronto per verifica",
  });

  await writeAuditLog({
    entity_type: "ocr_extraction",
    entity_id: documentId,
    action: "update",
    company_id: item.company_id ?? null,
    reason_type: "ocr_engine",
    new_values: { status: nextStatus, extracted_fields: extractedFields },
    source: "system",
  });

  return { ok: true, status: nextStatus };
}

export async function verifyDocumentCongruence(documentId: string) {
  const admin = createServiceRoleClient();
  const { data: itemData, error } = await admin
    .from("ocr_extraction")
    .select("id, company_id, status, doc_type, confidence_score, source_entity_type, source_entity_id, extracted_fields")
    .eq("id", documentId)
    .maybeSingle();

  if (error || !itemData) return { error: error?.message ?? "Documento OCR non trovato" };
  const item = itemData as OcrExtractionRow;

  const fields = item.extracted_fields ?? {};
  const checks = {
    has_document_type: Boolean(item.doc_type),
    has_destination: Boolean(item.source_entity_type && item.source_entity_id),
    readable: Number(item.confidence_score ?? 80) >= 60,
    not_duplicate: fields.duplicate_hash !== true,
    not_expired: fields.expired !== true,
  };
  const failed = Object.entries(checks).filter(([, ok]) => !ok).map(([key]) => key);
  const congruenceStatus: CongruenceStatus = failed.length === 0 ? "coerente" : failed.includes("has_destination") ? "da_verificare" : "non_congruente";

  const extractedFields = {
    ...fields,
    congruence_status: congruenceStatus,
    congruence_checks: checks,
    congruence_failed_checks: failed,
    verified_by_engine_at: new Date().toISOString(),
  };

  await admin
    .from("ocr_extraction")
    .update({
      status: congruenceStatus === "coerente" ? "verificato_manualmente" : "requires_manual_review",
      extracted_fields: extractedFields,
    })
    .eq("id", documentId);

  await admin.from("quality_event_log").insert({
    company_id: item.company_id ?? null,
    source_type: "ocr_extraction",
    source_id: documentId,
    event_type: congruenceStatus === "coerente" ? "document_congruence_ok" : "document_congruence_alert",
    severity: congruenceStatus === "coerente" ? "info" : "alert",
    message: congruenceStatus === "coerente"
      ? "Documento OCR congruente"
      : `Documento da verificare: ${failed.join(", ")}`,
  });

  return { ok: true, congruence_status: congruenceStatus, failed_checks: failed };
}

export async function routeEvidence(documentId: string) {
  const admin = createServiceRoleClient();
  const { data: ocrData } = await admin
    .from("ocr_extraction")
    .select("id, company_id, source_entity_type, source_entity_id, extracted_fields")
    .eq("id", documentId)
    .maybeSingle();

  if (!ocrData) return { error: "Documento non trovato" };
  const ocr = ocrData as OcrExtractionRow;
  const routed = Boolean(ocr.source_entity_type && ocr.source_entity_id);
  const routingStatus: RoutingStatus = routed ? "routed" : "quarantena";
  const extractedFields = {
    ...(ocr.extracted_fields ?? {}),
    routing_status: routingStatus,
    routed_at: routed ? new Date().toISOString() : null,
  };

  await admin
    .from("ocr_extraction")
    .update({ status: routed ? "verificato_manualmente" : "requires_manual_review", extracted_fields: extractedFields })
    .eq("id", documentId);

  await admin.from("quality_event_log").insert({
    company_id: ocr.company_id ?? null,
    source_type: "ocr_extraction",
    source_id: documentId,
    event_type: routed ? "evidence_routed" : "evidence_quarantine",
    severity: routed ? "info" : "alert",
    message: routed ? `Documento instradato verso ${ocr.source_entity_type}` : "Documento senza destinazione: quarantena qualità",
  });

  return { ok: true, routing_status: routingStatus };
}

export async function createRapidNC(payload: {
  company_id: string;
  project_id?: string | null;
  process_id?: string | null;
  evidence_id?: string | null;
  title: string;
  description: string;
  severity?: "minore" | "maggiore" | "critica";
  operator_id?: string | null;
}) {
  const admin = createServiceRoleClient();
  const { data: nc, error } = await admin
    .from("non_conformity")
    .insert({
      company_id: payload.company_id,
      process_id: payload.process_id ?? null,
      title: payload.title,
      description: payload.description,
      severity: payload.severity ?? "maggiore",
      detected_by: payload.operator_id ?? null,
    })
    .select("id")
    .single();

  if (error || !nc) return { error: error?.message ?? "Creazione NC rapida fallita" };

  if (payload.evidence_id) {
    await admin.from("live_evidence").update({
      verification_status: "sospetta",
      notes: `NC rapida collegata: ${nc.id}`,
    }).eq("id", payload.evidence_id);
  }

  await admin.from("quality_event_log").insert({
    company_id: payload.company_id,
    project_id: payload.project_id ?? null,
    source_type: "non_conformity",
    source_id: nc.id,
    event_type: "rapid_nc_created",
    severity: payload.severity === "critica" ? "critical" : "alert",
    message: `NC rapida aperta: ${payload.title}`,
  });

  await writeAuditLog({
    entity_type: "non_conformity",
    entity_id: nc.id,
    action: "create",
    company_id: payload.company_id,
    reason_type: "rapid_nc",
    new_values: payload,
    source: "mobile",
  });

  return { ok: true, nc_id: nc.id };
}

export async function processMaterialReception(receptionId: string) {
  const admin = createServiceRoleClient();
  const { data: receptionData, error } = await admin
    .from("material_reception")
    .select("*")
    .eq("id", receptionId)
    .maybeSingle();

  if (error || !receptionData) return { error: error?.message ?? "Ricezione non trovata" };
  const reception = receptionData as MaterialReceptionRow;

  const missingPhotos = ["photo_bolla_id", "photo_colli_id", "photo_etichetta_id", "photo_materiale_id"]
    .filter((field) => !reception[field]);
  const countMismatch = reception.count_matches === false;
  const destinationMismatch = reception.destination_matches === false;
  const shouldBlock = missingPhotos.length > 0 || countMismatch || destinationMismatch;

  await admin.from("material_reception").update({
    conformity_status: shouldBlock ? "parziale" : "conforme",
    status: shouldBlock ? "bloccata" : "approvata",
  }).eq("id", receptionId);

  if (shouldBlock) {
    await admin.from("quality_block").insert({
      company_id: reception.company_id,
      project_id: reception.project_id ?? null,
      type: "material_reception_block",
      severity: "block",
      description: `Ricezione ${(reception.reception_code ?? receptionId)} bloccata: ${[
        missingPhotos.length ? `foto mancanti ${missingPhotos.length}` : null,
        countMismatch ? "quantita non coerente" : null,
        destinationMismatch ? "destinazione non coerente" : null,
      ].filter(Boolean).join(", ")}`,
      action_required: "Completare evidenze ricezione o aprire NC",
      status: "aperto",
      opened_at: new Date().toISOString(),
    });
  }

  await admin.from("quality_event_log").insert({
    company_id: reception.company_id,
    project_id: reception.project_id ?? null,
    source_type: "material_reception",
    source_id: receptionId,
    event_type: shouldBlock ? "material_reception_blocked" : "material_reception_verified",
    severity: shouldBlock ? "block" : "info",
    message: shouldBlock ? "Ricezione materiale bloccata da controlli qualità" : "Ricezione materiale verificata e approvata",
  });

  return { ok: true, blocked: shouldBlock, missing_photos: missingPhotos };
}
