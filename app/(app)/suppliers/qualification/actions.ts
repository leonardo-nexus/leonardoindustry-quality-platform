"use server";
import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/audit/audit-log";
import { saveQualificationAction, enqueueSyncEvent } from "@/lib/quality/supplier-qualification";

const REQUIRED_DOCS = [
  "cciaa_visura", "durc", "rct_rco", "fiscale",
  "iso_9001", "iso_45001", "iso_14001",
];

export async function createQualificationAction(formData: FormData) {
  const session = await requireSession();
  if (!session.person) return { error: "Profilo persona mancante" };
  const admin = createServiceRoleClient();

  const supplier_name = (formData.get("supplier_name") as string)?.trim();
  const legal_name = (formData.get("legal_name") as string)?.trim();
  const tax_id = (formData.get("tax_id") as string) || null;
  const country = (formData.get("country") as string) || null;
  const erp_supplier_id = (formData.get("erp_supplier_id") as string) || null;
  const supplier_type = (formData.get("supplier_type") as string) || "materiale";
  const company_id = (formData.get("company_id") as string) || session.person.company_id;
  if (!supplier_name || !legal_name) return { error: "Nome fornitore + ragione sociale obbligatori" };

  const global_id = randomUUID();
  const validFrom = new Date().toISOString().slice(0, 10);
  const validUntil = new Date(Date.now() + 365 * 86400_000).toISOString().slice(0, 10);

  const { data: created, error } = await admin
    .from("supplier_qualification")
    .insert({
      company_id,
      supplier_name,
      legal_name,
      tax_id, country, erp_supplier_id,
      supplier_type,
      global_id,
      qualification_status: "pending",
      score: 0,
      minimum_threshold: 60,
      valid_from: validFrom,
      valid_until: validUntil,
      blocked_for_orders: true,
      block_reasons: ["Qualifica appena creata, nessun dato verificato"],
      source_app: "quality",
      sync_status: "pending",
      created_by: session.person.id,
      updated_by: session.person.id,
    })
    .select("id")
    .single();
  if (error || !created) return { error: error?.message ?? "Insert fallito" };

  // Crea qualification_document per ogni doc obbligatorio
  for (const docType of REQUIRED_DOCS) {
    await admin.from("qualification_document").insert({
      qualification_id: created.id,
      document_type: docType,
      mandatory: ["cciaa_visura", "durc", "rct_rco", "fiscale"].includes(docType),
      uploaded: false,
    });
  }

  // integration_mapping
  await admin.from("integration_mapping").insert({
    entity_type: "supplier_qualification",
    global_id,
    erp_id: erp_supplier_id,
    quality_id: created.id,
    source_app: "quality",
  });

  // Audit + outbox
  await writeAuditLog({
    entity_type: "supplier_qualification",
    entity_id: created.id,
    action: "create",
    new_values: { supplier_name, legal_name, global_id, erp_supplier_id },
  });
  await enqueueSyncEvent({
    entity_type: "supplier_qualification",
    entity_id: created.id,
    global_id,
    action: "supplier_qualification.created",
    payload: { global_id, supplier_name, legal_name, erp_supplier_id, qualification_status: "pending", score: 0, blocked_for_orders: true },
  });

  revalidatePath("/suppliers/qualification");
  return { ok: true, id: created.id };
}

export async function updateQualificationAction(qualificationId: string, patch: Record<string, unknown>) {
  return saveQualificationAction(qualificationId, patch);
}

export async function approveQualificationAction(qualificationId: string, reason: string) {
  const session = await requireSession();
  if (!session.person) return { error: "Profilo persona mancante" };
  if (!reason || reason.trim().length < 3) return { error: "Motivo approvazione obbligatorio" };

  const admin = createServiceRoleClient();
  const { error } = await admin.from("supplier_qualification").update({
    approved_by: session.person.id,
    approved_at: new Date().toISOString(),
    reviewed_by: session.person.id,
    reviewed_at: new Date().toISOString(),
  }).eq("id", qualificationId);
  if (error) return { error: error.message };

  await writeAuditLog({
    entity_type: "supplier_qualification",
    entity_id: qualificationId,
    action: "approve",
    reason,
  });
  revalidatePath(`/suppliers/qualification/${qualificationId}`);
  return { ok: true };
}
