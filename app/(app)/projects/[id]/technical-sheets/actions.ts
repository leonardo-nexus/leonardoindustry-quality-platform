"use server";
import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";
import { writeAuditLog, logUpdate } from "@/lib/audit/audit-log";
import { canStartProject } from "@/lib/quality/loss-prevention";

export async function createTechnicalSheetAction(projectId: string, companyId: string, formData: FormData) {
  const session = await requireSession();
  if (!session.person) return { error: "Profilo persona mancante" };
  const admin = createServiceRoleClient();

  const code = (formData.get("code") as string)?.trim();
  const title = (formData.get("title") as string)?.trim();
  const material_type = (formData.get("material_type") as string) || null;
  const supplier_name = (formData.get("supplier_name") as string) || null;
  const revision = (formData.get("revision") as string) || "00";
  if (!code || !title) return { error: "Codice e titolo obbligatori" };

  const { data: created, error } = await admin
    .from("technical_sheet")
    .insert({
      company_id: companyId,
      project_id: projectId,
      code, title, material_type, supplier_name, revision,
      issue_date: new Date().toISOString().slice(0,10),
      status: "da_approvare",
      created_by: session.person.id,
      updated_by: session.person.id,
    })
    .select("id")
    .single();
  if (error || !created) return { error: error?.message ?? "Insert fallito" };

  await writeAuditLog({ entity_type: "technical_sheet", entity_id: created.id, action: "create", new_values: { code, title } });
  await canStartProject(projectId);
  revalidatePath(`/projects/${projectId}/technical-sheets`);
  return { ok: true };
}

export async function approveTechnicalSheetAction(sheetId: string, projectId: string, reason: string) {
  const session = await requireSession();
  if (!session.person) return { error: "Profilo persona mancante" };
  if (!reason || reason.trim().length < 3) return { error: "Motivo approvazione obbligatorio" };

  const admin = createServiceRoleClient();
  const { data: prev } = await admin.from("technical_sheet").select("*").eq("id", sheetId).maybeSingle();
  if (!prev) return { error: "Scheda non trovata" };

  const { data: updated, error } = await admin
    .from("technical_sheet")
    .update({
      status: "approvata",
      approved_at: new Date().toISOString(),
      approved_by: session.person.id,
      reviewed_by: session.person.id,
      reviewed_at: new Date().toISOString(),
      updated_by: session.person.id,
    })
    .eq("id", sheetId)
    .select("*")
    .single();
  if (error || !updated) return { error: error?.message ?? "Update fallito" };

  await logUpdate("technical_sheet", sheetId, prev, updated, { reason, reason_type: "approvazione" });
  await writeAuditLog({ entity_type: "technical_sheet", entity_id: sheetId, action: "approve", reason });

  // Loss event correlato risolto
  await admin
    .from("loss_event")
    .update({ status: "risolto", resolved_at: new Date().toISOString(), resolved_by: session.person.id })
    .eq("source_type", "technical_sheet")
    .eq("source_id", sheetId)
    .eq("status", "aperto");

  await canStartProject(projectId);
  revalidatePath(`/projects/${projectId}/technical-sheets`);
  return { ok: true };
}
