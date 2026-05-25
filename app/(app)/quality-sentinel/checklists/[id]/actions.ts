"use server";
import { revalidatePath } from "next/cache";
import { createHash } from "node:crypto";
import { createServerClient, createServiceRoleClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";
import { writeAuditLog, logUpdate } from "@/lib/audit/audit-log";

export async function setItemResultAction(itemId: string, result: string, notes?: string) {
  const session = await requireSession();
  if (!session.person) return { error: "Profilo persona mancante" };

  const supabase = await createServerClient();

  // Snapshot precedente per audit
  const { data: prev } = await supabase
    .from("quality_checklist_item")
    .select("*")
    .eq("id", itemId)
    .maybeSingle();

  const { error } = await supabase
    .from("quality_checklist_item")
    .update({
      result,
      notes: notes || null,
      compiled_by: session.person.id,
      compiled_at: new Date().toISOString(),
    })
    .eq("id", itemId);
  if (error) return { error: error.message };

  // Audit log dell'esito
  if (prev) {
    await logUpdate("quality_checklist_item", itemId, prev, {
      ...prev, result, notes: notes || null, compiled_by: session.person.id,
    }, { reason_type: "compilazione" });
  }

  // Auto-aggiorna stato checklist a "in_corso" se era non_avviata
  const { data: item } = await supabase.from("quality_checklist_item").select("checklist_id").eq("id", itemId).single();
  if (item) {
    await supabase
      .from("quality_checklist")
      .update({ status: "in_corso" })
      .eq("id", item.checklist_id)
      .eq("status", "non_avviata");
  }

  revalidatePath("/quality-sentinel/checklists");
  return { ok: true };
}

export async function signChecklistAction(checklistId: string) {
  const session = await requireSession();
  if (!session.person) return { error: "Profilo persona mancante" };
  const supabase = await createServerClient();
  const { error } = await supabase
    .from("quality_checklist")
    .update({ signed_by: session.person.id, signed_at: new Date().toISOString() })
    .eq("id", checklistId);
  if (error) return { error: error.message };
  await writeAuditLog({
    entity_type: "quality_checklist",
    entity_id: checklistId,
    action: "sign",
  });
  revalidatePath(`/quality-sentinel/checklists/${checklistId}`);
  return { ok: true };
}

export async function completeChecklistAction(checklistId: string) {
  const session = await requireSession();
  const supabase = await createServerClient();
  // Il trigger DB enforce_checklist_completion verifica le condizioni e respinge se fallisce
  const { error } = await supabase
    .from("quality_checklist")
    .update({ status: "completata" })
    .eq("id", checklistId);
  if (error) return { error: error.message };
  await writeAuditLog({
    entity_type: "quality_checklist",
    entity_id: checklistId,
    action: "complete",
  });

  // Se è passata a non_conforme (trigger lo fa automaticamente per item critici NC), apri NC reale
  const { data: chk } = await supabase
    .from("quality_checklist")
    .select("id, code, title, status, plan_phase_id, phase:plan_phase_id(plan:plan_id(project_id, company_id))")
    .eq("id", checklistId)
    .single();
  if (chk?.status === "non_conforme") {
    const project_id = (chk as any).phase?.plan?.project_id;
    const company_id = (chk as any).phase?.plan?.company_id;
    if (company_id) {
      await supabase.from("non_conformity").insert({
        company_id,
        severity: "maggiore",
        title: `NC da checklist ${chk.code}: ${chk.title}`,
        description: `NC generata automaticamente da item critici NON CONFORMI nella checklist ${chk.code}`,
        detected_at: new Date().toISOString().slice(0, 10),
        detected_by: session.person?.id ?? null,
        status: "aperta",
      });
      // Crea anche un quality_block
      await supabase.from("quality_block").insert({
        company_id,
        project_id,
        checklist_id: checklistId,
        type: "checklist_incompleta",
        severity: "block",
        description: `Checklist ${chk.code} contiene item critici non conformi`,
        action_required: "Risolvere le non conformità o aprire azione correttiva",
      });
    }
  }

  revalidatePath(`/quality-sentinel/checklists/${checklistId}`);
  revalidatePath("/quality-sentinel");
  return { ok: true };
}

// Upload evidenza foto/file su item della checklist (mobile-first, capture=environment)
// Calcola SHA256 anti-duplicato, salva in storage `evidence`, inserisce in file_attachment + live_evidence,
// aggiorna quality_checklist_item.attachment_file_id e marca suspicion_flags se duplicato.
export async function uploadChecklistItemEvidenceAction(
  itemId: string,
  formData: FormData,
) {
  const session = await requireSession();
  if (!session.person) return { error: "Profilo persona mancante" };

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { error: "Nessun file selezionato" };
  if (file.size > 15 * 1024 * 1024) return { error: "File troppo grande (max 15MB)" };

  const latitudeRaw = formData.get("latitude");
  const longitudeRaw = formData.get("longitude");
  const latitude = latitudeRaw ? Number(latitudeRaw) : null;
  const longitude = longitudeRaw ? Number(longitudeRaw) : null;
  const deviceInfo = (formData.get("device_info") as string | null) ?? null;
  const notes = (formData.get("notes") as string | null) ?? null;

  const supabase = await createServerClient();

  // Recupera item + context
  const { data: item } = await supabase
    .from("quality_checklist_item")
    .select("id, checklist_id, ordering, checklist:checklist_id(id, code, plan_phase_id, phase:plan_phase_id(plan:plan_id(id, project_id, company_id)))")
    .eq("id", itemId)
    .maybeSingle();
  if (!item) return { error: "Item non trovato" };

  const company_id = (item as any).checklist?.phase?.plan?.company_id;
  const project_id = (item as any).checklist?.phase?.plan?.project_id;
  const quality_plan_id = (item as any).checklist?.phase?.plan?.id;
  const checklist_id = (item as any).checklist_id;
  if (!company_id) return { error: "Company del piano non trovata" };

  // SHA256 per dedupe
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const sha256 = createHash("sha256").update(buffer).digest("hex");

  // Verifica duplicati nella stessa company
  const { data: existingDup } = await supabase
    .from("live_evidence")
    .select("id, checklist_id, uploaded_at")
    .eq("company_id", company_id)
    .eq("file_sha256", sha256)
    .limit(1)
    .maybeSingle();

  // Storage path: evidence/<company>/<plan>/<checklist>/<item>/<timestamp>.<ext>
  const ext = (file.name.split(".").pop() || "bin").toLowerCase();
  const safeExt = ext.length <= 6 ? ext : "bin";
  const timestamp = Date.now();
  const storagePath = `${company_id}/${quality_plan_id ?? "no-plan"}/${checklist_id}/${itemId}/${timestamp}.${safeExt}`;

  // Upload con service role (RLS è off ma policy potrebbero bloccare la PUT autenticata)
  const admin = createServiceRoleClient();
  const { error: upErr } = await admin.storage
    .from("evidence")
    .upload(storagePath, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
  if (upErr) return { error: `Upload storage fallito: ${upErr.message}` };

  // Inserisci file_attachment
  const { data: fa, error: faErr } = await admin
    .from("file_attachment")
    .insert({
      company_id,
      bucket: "evidence",
      storage_path: storagePath,
      original_path: file.name,
      file_name: file.name,
      mime_type: file.type || null,
      size_bytes: file.size,
      checksum: sha256,
      uploaded_by: session.person.id,
    })
    .select("id")
    .single();
  if (faErr || !fa) {
    // rollback storage best-effort
    await admin.storage.from("evidence").remove([storagePath]);
    return { error: `Inserimento file_attachment fallito: ${faErr?.message}` };
  }

  // Determina evidence_type
  const mime = (file.type || "").toLowerCase();
  let evidenceType: "foto" | "documento" | "video" | "audio" | "firma" | "altro" = "altro";
  if (mime.startsWith("image/")) evidenceType = "foto";
  else if (mime.startsWith("video/")) evidenceType = "video";
  else if (mime.startsWith("audio/")) evidenceType = "audio";
  else if (mime === "application/pdf" || mime.includes("document") || mime.includes("sheet")) evidenceType = "documento";

  // Suspicion flags lato app (oltre al trigger DB)
  const flags: string[] = [];
  if (existingDup) flags.push("duplicate_sha256");
  if (!latitude || !longitude) flags.push("no_geolocation");
  if (file.size < 5_000) flags.push("very_small_file");

  // Inserisci live_evidence
  const { error: leErr } = await admin.from("live_evidence").insert({
    company_id,
    project_id,
    quality_plan_id,
    checklist_id,
    checklist_item_id: itemId,
    uploaded_by: session.person.id,
    evidence_type: evidenceType,
    file_id: fa.id,
    file_sha256: sha256,
    captured_at: new Date().toISOString(),
    uploaded_at: new Date().toISOString(),
    latitude,
    longitude,
    device_info: deviceInfo,
    source: "mobile",
    notes,
    verification_status: existingDup ? "sospetta" : "non_verificata",
    suspicion_flags: flags.length ? flags : null,
  });
  if (leErr) {
    // non bloccare hard ma logga
    console.warn("live_evidence insert failed", leErr.message);
  }

  // Aggiorna l'item: attachment_file_id
  await admin
    .from("quality_checklist_item")
    .update({ attachment_file_id: fa.id })
    .eq("id", itemId);

  // Se è duplicato, alza notifica
  if (existingDup) {
    await admin.from("notification").insert({
      company_id,
      project_id,
      source_type: "live_evidence",
      source_id: fa.id,
      severity: "alert",
      title: `Evidenza sospetta: foto duplicata su item checklist`,
      message: `Il file caricato ha lo stesso hash SHA256 di un'evidenza già presente in azienda. Verificare se è stata riutilizzata una foto già usata altrove.`,
      action_url: `/quality-sentinel/checklists/${checklist_id}`,
    });
  }

  revalidatePath(`/quality-sentinel/checklists/${checklist_id}`);
  return { ok: true, duplicate: !!existingDup, suspicion_flags: flags };
}
