"use server";
import { revalidatePath } from "next/cache";
import { createHash } from "node:crypto";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";
import { signApplicative, type SignatureAction } from "@/lib/audit/signature";
import { writeAuditLog } from "@/lib/audit/audit-log";

const KIND_TO_EVIDENCE_TYPE: Record<string, string> = {
  foto: "foto_materiale",
  scan_documento: "documento_scansionato",
  allegato: "documento_scansionato",
  firma: "firma_operatore",
};

const KIND_TO_SIGNATURE_ACTION: Record<string, SignatureAction> = {
  foto: "upload_foto",
  scan_documento: "upload_foto",
  allegato: "upload_foto",
  firma: "firma_responsabile",
};

const KIND_TO_DOC_TYPE: Record<string, string> = {
  foto: "etichetta",
  scan_documento: "bolla_ddt", // default; il chiamante può override via FormData
  allegato: "altro",
};

/**
 * Upload evidenza mobile + firma applicativa automatica + predisposizione OCR.
 */
export async function uploadMobileEvidenceAction(formData: FormData) {
  const session = await requireSession();
  if (!session.person) return { error: "Profilo persona mancante" };

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { error: "Nessun file" };
  if (file.size > 15 * 1024 * 1024) return { error: "File troppo grande (15MB max)" };

  const kind = (formData.get("kind") as string) || "foto";
  const entity_type = (formData.get("entity_type") as string)?.trim();
  const entity_id = (formData.get("entity_id") as string)?.trim();
  const company_id = (formData.get("company_id") as string) || session.person.company_id;
  const project_id = (formData.get("project_id") as string) || null;
  const evidence_type = (formData.get("evidence_type") as string) || KIND_TO_EVIDENCE_TYPE[kind] || "altro";
  const notes = (formData.get("notes") as string) || null;
  const device_info = (formData.get("device_info") as string) || null;
  const latitude = formData.get("latitude") ? Number(formData.get("latitude")) : null;
  const longitude = formData.get("longitude") ? Number(formData.get("longitude")) : null;

  if (!entity_type || !entity_id) return { error: "entity_type + entity_id obbligatori" };

  const admin = createServiceRoleClient();
  const buf = Buffer.from(await file.arrayBuffer());
  const sha256 = createHash("sha256").update(buf).digest("hex");
  const ext = (file.name.split(".").pop() || "bin").toLowerCase().slice(0, 6);
  const path = `${company_id}/mobile-evidence/${entity_type}/${entity_id}/${Date.now()}.${ext}`;

  const { error: upErr } = await admin.storage.from("evidence").upload(path, buf, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (upErr) return { error: `Upload: ${upErr.message}` };

  const { data: fa, error: faErr } = await admin.from("file_attachment").insert({
    company_id,
    bucket: "evidence",
    storage_path: path,
    file_name: file.name,
    mime_type: file.type,
    size_bytes: file.size,
    checksum: sha256,
    uploaded_by: session.person.id,
  }).select("id").single();
  if (faErr || !fa) {
    await admin.storage.from("evidence").remove([path]);
    return { error: faErr?.message ?? "file_attachment insert fallito" };
  }

  // live_evidence
  const { data: ev, error: evErr } = await admin.from("live_evidence").insert({
    company_id, project_id,
    uploaded_by: session.person.id,
    evidence_type,
    file_id: fa.id,
    file_sha256: sha256,
    captured_at: new Date().toISOString(),
    uploaded_at: new Date().toISOString(),
    latitude, longitude,
    device_info,
    source: "mobile",
    notes: `${entity_type}:${entity_id}${notes ? ` · ${notes}` : ""}`,
    verification_status: "non_verificata",
  }).select("id").single();
  if (evErr) {
    await admin.storage.from("evidence").remove([path]);
    await admin.from("file_attachment").delete().eq("id", fa.id);
    return { error: `live_evidence: ${evErr.message}` };
  }

  // OCR predisposizione (scan documento)
  if (kind === "scan_documento") {
    await admin.from("ocr_extraction").insert({
      company_id,
      source_file_id: fa.id,
      source_entity_type: entity_type,
      source_entity_id: entity_id,
      doc_type: KIND_TO_DOC_TYPE[kind] ?? "altro",
      status: "da_processare",
    });
  }

  // Firma applicativa
  const sig = await signApplicative({
    entity_type, entity_id, action: KIND_TO_SIGNATURE_ACTION[kind] ?? "upload_foto",
    company_id, project_id,
    source: "mobile",
    device_info, geolocation_lat: latitude, geolocation_lon: longitude,
    notes: `Mobile evidence ${kind}: ${file.name}`,
  });

  // Audit log
  await writeAuditLog({
    entity_type, entity_id, action: "upload",
    company_id,
    source: "mobile",
    reason: `Mobile evidence ${kind}: ${file.name}`,
  });

  revalidatePath("/");
  return {
    ok: true,
    file_id: fa.id,
    evidence_id: ev?.id ?? null,
    signature_id: "id" in sig ? sig.id : null,
  };
}
