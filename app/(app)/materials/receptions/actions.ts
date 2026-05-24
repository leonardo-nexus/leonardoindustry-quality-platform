"use server";
import { revalidatePath } from "next/cache";
import { createHash } from "node:crypto";
import { createServerClient, createServiceRoleClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";
import { writeAuditLog, logUpdate } from "@/lib/audit/audit-log";
import { createAssignment } from "@/lib/permissions/rbac";

/** Crea una nuova ricezione materiale e la assegna a un operatore */
export async function createReceptionAction(formData: FormData) {
  const session = await requireSession();
  if (!session.person) return { error: "Profilo persona mancante" };
  const admin = createServiceRoleClient();

  const company_id = (formData.get("company_id") as string)?.trim();
  const project_id = (formData.get("project_id") as string) || null;
  const reception_code = (formData.get("reception_code") as string)?.trim();
  const assigned_to_person_id = (formData.get("assigned_to_person_id") as string)?.trim();
  const scheduled_for = (formData.get("scheduled_for") as string) || null;
  const expected_quantity = formData.get("expected_quantity") ? Number(formData.get("expected_quantity")) : null;
  const expected_destination = (formData.get("expected_destination") as string) || null;
  if (!company_id || !reception_code || !assigned_to_person_id) return { error: "Campi obbligatori mancanti" };

  const { data: created, error } = await admin
    .from("material_reception")
    .insert({
      company_id, project_id, reception_code, assigned_to_person_id,
      scheduled_for, expected_quantity, expected_destination,
      created_by: session.person.id,
      updated_by: session.person.id,
    })
    .select("id")
    .single();
  if (error || !created) return { error: error?.message ?? "Insert fallito" };

  // Assignment automatico in /my-work dell'operatore
  await createAssignment({
    company_id,
    project_id,
    assigned_to_person_id,
    entity_type: "material_reception",
    entity_id: created.id,
    assignment_type: "reception",
    priority: "alta",
    due_date: scheduled_for ?? new Date().toISOString().slice(0, 10),
    notes: `Ricezione materiale ${reception_code}`,
  });

  await writeAuditLog({ entity_type: "material_reception", entity_id: created.id, action: "create", new_values: { reception_code, assigned_to_person_id } });
  revalidatePath("/materials");
  return { ok: true, id: created.id };
}

/** Operatore prende in carico la ricezione */
export async function takeInChargeAction(receptionId: string) {
  const session = await requireSession();
  if (!session.person) return { error: "Profilo persona mancante" };
  const admin = createServiceRoleClient();
  const { data: prev } = await admin.from("material_reception").select("*").eq("id", receptionId).maybeSingle();
  if (!prev) return { error: "Non trovata" };
  if (prev.taken_in_charge_by) return { error: "Già presa in carico" };

  await admin.from("material_reception").update({
    taken_in_charge_at: new Date().toISOString(),
    taken_in_charge_by: session.person.id,
    status: "in_corso",
    updated_by: session.person.id,
  }).eq("id", receptionId);
  await writeAuditLog({ entity_type: "material_reception", entity_id: receptionId, action: "update", reason_type: "presa_carico" });
  revalidatePath(`/materials/receptions/${receptionId}`);
  return { ok: true };
}

/** Upload foto live ricezione (bolla/colli/etichetta/materiale) */
export async function uploadReceptionPhotoAction(
  receptionId: string,
  photoType: "bolla" | "colli" | "etichetta" | "materiale",
  formData: FormData,
) {
  const session = await requireSession();
  if (!session.person) return { error: "Profilo persona mancante" };
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { error: "Nessun file" };
  if (file.size > 15 * 1024 * 1024) return { error: "File troppo grande (15MB)" };

  const supabase = await createServerClient();
  const { data: rec } = await supabase.from("material_reception").select("company_id, project_id").eq("id", receptionId).maybeSingle();
  if (!rec) return { error: "Ricezione non trovata" };

  const buf = Buffer.from(await file.arrayBuffer());
  const sha256 = createHash("sha256").update(buf).digest("hex");
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${rec.company_id}/reception/${receptionId}/${photoType}_${Date.now()}.${ext}`;

  const admin = createServiceRoleClient();
  const { error: upErr } = await admin.storage.from("evidence").upload(path, buf, { contentType: file.type, upsert: false });
  if (upErr) return { error: `Upload: ${upErr.message}` };

  const { data: fa } = await admin.from("file_attachment").insert({
    company_id: rec.company_id, bucket: "evidence", storage_path: path, file_name: file.name,
    mime_type: file.type, size_bytes: file.size, checksum: sha256, uploaded_by: session.person.id,
  }).select("id").single();

  const { data: ev } = await admin.from("live_evidence").insert({
    company_id: rec.company_id, project_id: rec.project_id,
    uploaded_by: session.person.id,
    evidence_type: photoType === "bolla" || photoType === "etichetta" ? "foto_etichetta" : "foto_materiale",
    file_id: fa?.id, file_sha256: sha256,
    captured_at: new Date().toISOString(),
    uploaded_at: new Date().toISOString(),
    source: "mobile_capture",
    notes: `Ricezione ${receptionId} · ${photoType}`,
    verification_status: "in_verifica",
  }).select("id").single();

  // Aggiorna campo specifico
  const updateField: Record<string, string> = {
    bolla: "photo_bolla_id", colli: "photo_colli_id",
    etichetta: "photo_etichetta_id", materiale: "photo_materiale_id",
  };
  await admin.from("material_reception").update({
    [updateField[photoType]]: ev?.id,
    updated_by: session.person.id,
  }).eq("id", receptionId);

  revalidatePath(`/materials/receptions/${receptionId}`);
  return { ok: true };
}

/** Conteggio pezzi + check destinazione */
export async function recordCountAction(receptionId: string, bolla: number, counted: number, actualDestination: string | null) {
  const session = await requireSession();
  if (!session.person) return { error: "Profilo persona mancante" };
  const admin = createServiceRoleClient();
  const { data: prev } = await admin.from("material_reception").select("*").eq("id", receptionId).maybeSingle();
  if (!prev) return { error: "Non trovata" };

  const count_matches = bolla === counted && (prev.expected_quantity == null || bolla === Number(prev.expected_quantity));
  const destination_matches = !prev.expected_destination || !actualDestination || prev.expected_destination.trim().toLowerCase() === actualDestination.trim().toLowerCase();

  await admin.from("material_reception").update({
    bolla_quantity: bolla, counted_quantity: counted,
    actual_destination: actualDestination,
    count_matches, destination_matches,
    updated_by: session.person.id,
  }).eq("id", receptionId);

  await writeAuditLog({
    entity_type: "material_reception", entity_id: receptionId, action: "update", reason_type: "conteggio",
    new_values: { bolla, counted, actualDestination, count_matches, destination_matches },
  });

  revalidatePath(`/materials/receptions/${receptionId}`);
  return { ok: true, count_matches, destination_matches };
}

/** Firma operatore + esito conformità + eventuale apertura NC */
export async function signReceptionAction(
  receptionId: string,
  conformityStatus: "conforme" | "non_conforme" | "parziale" | "bloccato",
  notes?: string,
  damageNotes?: string,
) {
  const session = await requireSession();
  if (!session.person) return { error: "Profilo persona mancante" };
  const admin = createServiceRoleClient();
  const { data: prev } = await admin.from("material_reception").select("*").eq("id", receptionId).maybeSingle();
  if (!prev) return { error: "Non trovata" };

  // Blocchi obbligatori prima della firma: tutte le foto + conteggio
  if (!prev.photo_bolla_id || !prev.photo_colli_id || !prev.photo_etichetta_id || !prev.photo_materiale_id) {
    return { error: "Devi caricare TUTTE le 4 foto (bolla/colli/etichetta/materiale) prima di firmare" };
  }
  if (prev.counted_quantity == null) return { error: "Devi inserire il conteggio prima di firmare" };

  const newStatus = conformityStatus === "conforme" ? "firmata" : "NC_aperta";

  await admin.from("material_reception").update({
    conformity_status: conformityStatus,
    operator_signature_at: new Date().toISOString(),
    operator_signature_by: session.person.id,
    notes, damage_notes: damageNotes,
    status: newStatus,
    updated_by: session.person.id,
  }).eq("id", receptionId);

  await writeAuditLog({ entity_type: "material_reception", entity_id: receptionId, action: "sign", reason: `Firma esito ${conformityStatus}` });

  // Se non conforme → apri material_nc + loss_event
  if (conformityStatus !== "conforme") {
    const category = !prev.count_matches ? "quantita_errata" : !prev.destination_matches ? "destinazione_errata" : "causa_da_determinare";
    const { data: nc } = await admin.from("material_nc").insert({
      company_id: prev.company_id,
      project_id: prev.project_id,
      material_reception_id: receptionId,
      material_lot_id: prev.material_lot_id,
      category,
      description: `Ricezione ${prev.reception_code}: ${conformityStatus}. ${notes ?? ""} ${damageNotes ?? ""}`.trim(),
      cause_responsibility: "da_determinare",
      created_by: session.person.id,
      updated_by: session.person.id,
    }).select("id").single();

    await admin.from("loss_event").insert({
      company_id: prev.company_id,
      project_id: prev.project_id,
      category: category === "destinazione_errata" ? "materiale_non_certificato" : "materiale_non_certificato",
      severity: conformityStatus === "bloccato" ? "blocco" : "critico",
      title: `Materiale ricezione ${prev.reception_code}: ${conformityStatus}`,
      description: notes ?? damageNotes ?? null,
      source_type: "material_nc",
      source_id: nc?.id ?? null,
      status: "aperto",
    });

    await writeAuditLog({ entity_type: "material_reception", entity_id: receptionId, action: "block", reason: `Esito ${conformityStatus}` });
  }

  // Chiudi l'assignment correlato
  await admin
    .from("user_assignment")
    .update({ status: "completata", completed_at: new Date().toISOString() })
    .eq("entity_type", "material_reception")
    .eq("entity_id", receptionId)
    .eq("assigned_to_person_id", session.person.id);

  revalidatePath(`/materials/receptions/${receptionId}`);
  revalidatePath("/my-work");
  return { ok: true };
}
