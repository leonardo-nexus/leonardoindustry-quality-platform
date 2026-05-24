"use server";
import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";
import { writeAuditLog, logUpdate } from "@/lib/audit/audit-log";
import { canUseMaterial } from "@/lib/quality/loss-prevention";

export async function createMaterialLotAction(projectId: string, companyId: string, formData: FormData) {
  const session = await requireSession();
  if (!session.person) return { error: "Profilo persona mancante" };
  const admin = createServiceRoleClient();

  const lot_code = (formData.get("lot_code") as string)?.trim();
  const material_description = (formData.get("material_description") as string)?.trim();
  const technical_sheet_id = (formData.get("technical_sheet_id") as string) || null;
  const heat_number = (formData.get("heat_number") as string)?.trim() || lot_code;
  const material_grade = (formData.get("material_grade") as string)?.trim() || "—";
  const quantity = formData.get("quantity") ? Number(formData.get("quantity")) : null;
  const unit = (formData.get("unit") as string) || null;
  const supplier_name = (formData.get("supplier_name") as string) || null;
  if (!lot_code) return { error: "Codice lotto obbligatorio" };

  const { data: created, error } = await admin
    .from("material_lot")
    .insert({
      company_id: companyId,
      project_id: projectId,
      lot_code, material_description, technical_sheet_id,
      heat_number, material_grade, quantity, unit, supplier_name,
      status: "in_attesa_verifica",
      created_by: session.person.id,
      updated_by: session.person.id,
    })
    .select("id")
    .single();
  if (error || !created) return { error: error?.message ?? "Insert fallito" };

  await writeAuditLog({ entity_type: "material_lot", entity_id: created.id, action: "create", new_values: { lot_code, material_description } });

  // Verifica immediata: se mancano cert/scheda/foto → block automatico con motivazione
  const gate = await canUseMaterial(created.id);
  if (!gate.is_usable) {
    const reason = gate.blockers.map(b => b.label).join(" · ");
    await admin.from("material_lot").update({ status: "bloccato", block_reason: reason }).eq("id", created.id);
    await writeAuditLog({ entity_type: "material_lot", entity_id: created.id, action: "block", reason });
  }
  revalidatePath(`/projects/${projectId}/materials`);
  revalidatePath(`/materials`);
  return { ok: true };
}

export async function verifyMaterialAction(lotId: string, projectId: string, reason: string) {
  const session = await requireSession();
  if (!session.person) return { error: "Profilo persona mancante" };
  if (!reason || reason.trim().length < 3) return { error: "Motivo verifica obbligatorio" };

  const admin = createServiceRoleClient();
  const gate = await canUseMaterial(lotId);
  if (!gate.is_usable) {
    return { error: `Impossibile verificare: ${gate.blockers.map(b => b.label).join(", ")}` };
  }

  const { data: prev } = await admin.from("material_lot").select("*").eq("id", lotId).maybeSingle();
  if (!prev) return { error: "Lotto non trovato" };

  const { data: updated, error } = await admin
    .from("material_lot")
    .update({
      status: "verificato",
      live_check_at: new Date().toISOString(),
      live_check_by: session.person.id,
      updated_by: session.person.id,
      block_reason: null,
    })
    .eq("id", lotId)
    .select("*")
    .single();
  if (error || !updated) return { error: error?.message ?? "Update fallito" };

  await logUpdate("material_lot", lotId, prev, updated, { reason, reason_type: "verifica_lotto" });
  await writeAuditLog({ entity_type: "material_lot", entity_id: lotId, action: "approve", reason });

  await admin
    .from("loss_event")
    .update({ status: "risolto", resolved_at: new Date().toISOString(), resolved_by: session.person.id })
    .eq("source_type", "material_lot")
    .eq("source_id", lotId)
    .eq("status", "aperto");

  revalidatePath(`/projects/${projectId}/materials`);
  revalidatePath(`/materials/${lotId}`);
  return { ok: true };
}

export async function recheckMaterialAction(lotId: string, projectId: string) {
  const session = await requireSession();
  if (!session.person) return { error: "Profilo persona mancante" };
  const admin = createServiceRoleClient();
  const gate = await canUseMaterial(lotId);
  const reason = gate.is_usable ? "Materiale pronto per verifica live" : gate.blockers.map(b => b.label).join(" · ");
  const newStatus = gate.is_usable ? "in_attesa_verifica" : "bloccato";
  await admin.from("material_lot").update({ status: newStatus, block_reason: gate.is_usable ? null : reason, updated_by: session.person.id }).eq("id", lotId);
  await writeAuditLog({ entity_type: "material_lot", entity_id: lotId, action: gate.is_usable ? "unblock" : "block", reason });
  revalidatePath(`/projects/${projectId}/materials`);
  revalidatePath(`/materials/${lotId}`);
  return { ok: true, gate };
}
