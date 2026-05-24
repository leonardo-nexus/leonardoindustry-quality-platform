"use server";
import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";
import { writeAuditLog, logUpdate } from "@/lib/audit/audit-log";

export async function createMaterialRequestAction(formData: FormData) {
  const session = await requireSession();
  if (!session.person) return { error: "Profilo persona mancante" };
  const admin = createServiceRoleClient();

  const company_id = (formData.get("company_id") as string) || session.person.company_id;
  const project_id = (formData.get("project_id") as string) || null;
  const request_code = (formData.get("request_code") as string)?.trim();
  const material_description = (formData.get("material_description") as string)?.trim();
  const technical_sheet_id = (formData.get("technical_sheet_id") as string) || null;
  const quantity = formData.get("quantity") ? Number(formData.get("quantity")) : null;
  const unit = (formData.get("unit") as string) || null;
  const needed_by = (formData.get("needed_by") as string) || null;
  const destination_country = (formData.get("destination_country") as string) || null;
  const destination_site = (formData.get("destination_site") as string) || null;
  if (!request_code || !material_description) return { error: "Codice + descrizione obbligatori" };

  const { data: created, error } = await admin
    .from("material_request")
    .insert({
      company_id, project_id, request_code, material_description, technical_sheet_id,
      quantity, unit, needed_by, destination_country, destination_site,
      requested_by: session.person.id,
      status: "inviata",
      created_by: session.person.id,
      updated_by: session.person.id,
    })
    .select("id")
    .single();
  if (error || !created) return { error: error?.message ?? "Insert fallito" };

  await writeAuditLog({ entity_type: "material_request", entity_id: created.id, action: "create", new_values: { request_code, material_description } });
  revalidatePath("/material-requests");
  return { ok: true, id: created.id };
}

export async function approveRequestAction(requestId: string, reason: string) {
  const session = await requireSession();
  if (!session.person) return { error: "Profilo persona mancante" };
  if (!reason || reason.trim().length < 3) return { error: "Motivo approvazione obbligatorio" };
  const admin = createServiceRoleClient();
  const { data: prev } = await admin.from("material_request").select("*").eq("id", requestId).maybeSingle();
  if (!prev) return { error: "Non trovata" };

  const { data: updated, error } = await admin
    .from("material_request")
    .update({
      status: "approvata",
      approved_by: session.person.id,
      approved_at: new Date().toISOString(),
      updated_by: session.person.id,
    })
    .eq("id", requestId)
    .select("*")
    .single();
  if (error || !updated) return { error: error?.message ?? "Update fallito" };

  await logUpdate("material_request", requestId, prev, updated, { reason, reason_type: "approvazione" });
  await writeAuditLog({ entity_type: "material_request", entity_id: requestId, action: "approve", reason });
  revalidatePath(`/material-requests/${requestId}`);
  revalidatePath("/material-requests");
  return { ok: true };
}

export async function rejectRequestAction(requestId: string, reason: string) {
  const session = await requireSession();
  if (!session.person) return { error: "Profilo persona mancante" };
  if (!reason || reason.trim().length < 3) return { error: "Motivo respingimento obbligatorio" };
  const admin = createServiceRoleClient();
  await admin.from("material_request").update({ status: "rifiutata", updated_by: session.person.id }).eq("id", requestId);
  await writeAuditLog({ entity_type: "material_request", entity_id: requestId, action: "reject", reason });
  revalidatePath("/material-requests");
  return { ok: true };
}
