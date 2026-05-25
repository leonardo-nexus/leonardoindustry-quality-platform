"use server";
import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/audit/audit-log";
import { saveQualificationAction, enqueueSyncEvent } from "@/lib/quality/supplier-qualification";
import { DOCUMENT_QUALIFICATION_REQUIREMENTS } from "@/lib/quality/supplier-qualification-scoring";

export async function createQualificationAction(formData: FormData) {
  const session = await requireSession();
  if (!session.person) return { error: "Profilo persona mancante" };
  const admin = createServiceRoleClient();

  const supplier_name = (formData.get("supplier_name") as string)?.trim();
  const legal_name = (formData.get("legal_name") as string)?.trim();
  const tax_id = (formData.get("tax_id") as string) || null;
  const country = (formData.get("country") as string) || null;
  const email = (formData.get("email") as string) || null;
  const phone = (formData.get("phone") as string) || null;
  const address = (formData.get("address") as string) || null;
  const city = (formData.get("city") as string) || null;
  const province = (formData.get("province") as string) || null;
  const postal_code = (formData.get("postal_code") as string) || null;
  const pec = (formData.get("pec") as string) || null;
  const codice_sdi = (formData.get("codice_sdi") as string) || null;
  const website = (formData.get("website") as string) || null;
  const contact_name = (formData.get("contact_name") as string) || null;
  const contact_role = (formData.get("contact_role") as string) || null;
  const contact_email = (formData.get("contact_email") as string) || null;
  const contact_phone = (formData.get("contact_phone") as string) || null;
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
      email,
      phone,
      address,
      supplier_type,
      global_id,
      legal_compliance: {
        city,
        province,
        postal_code,
        pec,
        codice_sdi,
        website,
        contact_name,
        contact_role,
        contact_email,
        contact_phone,
        sede_legale: !!address,
      },
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

  // Crea qualification_document per ogni requisito documentale della checklist.
  for (const requirement of DOCUMENT_QUALIFICATION_REQUIREMENTS) {
    await admin.from("qualification_document").insert({
      qualification_id: created.id,
      document_type: requirement.document_type,
      mandatory: requirement.mandatory,
      uploaded: false,
      verified: false,
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
    new_values: { supplier_name, legal_name, global_id, erp_supplier_id, email, phone, address },
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

export async function updateDocumentQualificationChecklistAction(
  qualificationId: string,
  items: Array<{ id: string; document_type: string; checked: boolean; expiry_date?: string | null }>,
) {
  const session = await requireSession();
  if (!session.person) return { error: "Profilo persona mancante" };
  const admin = createServiceRoleClient();

  const { data: qualification } = await admin
    .from("supplier_qualification")
    .select("id")
    .eq("id", qualificationId)
    .maybeSingle();
  if (!qualification) return { error: "Qualifica non trovata" };

  const { data: before } = await admin
    .from("qualification_document")
    .select("*")
    .eq("qualification_id", qualificationId);

  for (const item of items) {
    const updates = {
      uploaded: item.checked,
      verified: item.checked,
      expiry_date: item.expiry_date || null,
    };

    if (item.id.startsWith("new:")) {
      const requirement = DOCUMENT_QUALIFICATION_REQUIREMENTS.find((r) => r.document_type === item.document_type);
      await admin.from("qualification_document").insert({
        qualification_id: qualificationId,
        document_type: item.document_type,
        mandatory: requirement?.mandatory ?? false,
        ...updates,
      });
    } else {
      await admin
        .from("qualification_document")
        .update(updates)
        .eq("id", item.id)
        .eq("qualification_id", qualificationId);
    }
  }

  const recalculated = await saveQualificationAction(qualificationId, {});

  const { data: after } = await admin
    .from("qualification_document")
    .select("*")
    .eq("qualification_id", qualificationId);

  await writeAuditLog({
    entity_type: "supplier_qualification",
    entity_id: qualificationId,
    action: "update",
    old_values: { qualification_documents: before ?? [] },
    new_values: { qualification_documents: after ?? [] },
    reason_type: "documental_qualification_checklist",
  });

  revalidatePath(`/suppliers/qualification/${qualificationId}`);
  revalidatePath("/suppliers/qualification");
  revalidatePath("/suppliers");
  return recalculated;
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
