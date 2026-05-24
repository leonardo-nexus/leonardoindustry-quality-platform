"use server";
import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";
import { writeAuditLog, logUpdate } from "@/lib/audit/audit-log";
import { canStartProject } from "@/lib/quality/loss-prevention";

export async function verifyContractAction(contractId: string, projectId: string, reason: string) {
  const session = await requireSession();
  if (!session.person) return { error: "Profilo persona mancante" };
  if (!reason || reason.trim().length < 3) return { error: "Motivo verifica obbligatorio" };

  const admin = createServiceRoleClient();
  const { data: prev } = await admin.from("contract").select("*").eq("id", contractId).maybeSingle();
  if (!prev) return { error: "Contratto non trovato" };

  const { data: updated, error } = await admin
    .from("contract")
    .update({
      status: "verificato",
      verified_at: new Date().toISOString(),
      verified_by: session.person.id,
      read_at: prev.read_at ?? new Date().toISOString(),
      read_by: prev.read_by ?? session.person.id,
      reviewed_by: session.person.id,
      reviewed_at: new Date().toISOString(),
      updated_by: session.person.id,
    })
    .eq("id", contractId)
    .select("*")
    .single();
  if (error || !updated) return { error: error?.message ?? "Update fallito" };

  await logUpdate("contract", contractId, prev, updated, { reason, reason_type: "verifica_contratto" });
  await writeAuditLog({ entity_type: "contract", entity_id: contractId, action: "approve", reason });

  // Loss event correlato risolto?
  await admin
    .from("loss_event")
    .update({ status: "risolto", resolved_at: new Date().toISOString(), resolved_by: session.person.id })
    .eq("source_type", "contract")
    .eq("source_id", contractId)
    .eq("status", "aperto");

  await canStartProject(projectId);
  revalidatePath(`/projects/${projectId}/contracts`);
  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}

export async function setClauseStatusAction(clauseId: string, projectId: string, status: string, notes?: string) {
  const session = await requireSession();
  if (!session.person) return { error: "Profilo persona mancante" };
  const admin = createServiceRoleClient();

  const { data: prev } = await admin.from("contract_clause").select("*").eq("id", clauseId).maybeSingle();
  if (!prev) return { error: "Clausola non trovata" };

  const { data: updated, error } = await admin
    .from("contract_clause")
    .update({
      status,
      notes: notes ?? prev.notes,
      reviewed_by: session.person.id,
      reviewed_at: new Date().toISOString(),
      updated_by: session.person.id,
    })
    .eq("id", clauseId)
    .select("*")
    .single();
  if (error || !updated) return { error: error?.message ?? "Update fallito" };

  await logUpdate("contract_clause", clauseId, prev, updated, { reason_type: "stato_clausola" });
  await canStartProject(projectId);
  revalidatePath(`/projects/${projectId}/contracts`);
  return { ok: true };
}

export async function createContractAction(projectId: string, companyId: string, formData: FormData) {
  const session = await requireSession();
  if (!session.person) return { error: "Profilo persona mancante" };
  const admin = createServiceRoleClient();

  const code = (formData.get("code") as string)?.trim();
  const title = (formData.get("title") as string)?.trim();
  const client_name = (formData.get("client_name") as string)?.trim();
  const value_euro = formData.get("value_euro") ? Number(formData.get("value_euro")) : null;
  const penalty_clauses = (formData.get("penalty_clauses") as string) || null;
  if (!code || !title) return { error: "Codice e titolo obbligatori" };

  const { data: created, error } = await admin
    .from("contract")
    .insert({
      company_id: companyId,
      project_id: projectId,
      code, title, client_name, value_euro, penalty_clauses,
      status: "da_verificare",
      created_by: session.person.id,
      updated_by: session.person.id,
    })
    .select("id")
    .single();
  if (error || !created) return { error: error?.message ?? "Insert fallito" };

  await writeAuditLog({ entity_type: "contract", entity_id: created.id, action: "create", new_values: { code, title, client_name } });
  await canStartProject(projectId);
  revalidatePath(`/projects/${projectId}/contracts`);
  return { ok: true };
}

export async function createClauseAction(contractId: string, projectId: string, companyId: string, formData: FormData) {
  const session = await requireSession();
  if (!session.person) return { error: "Profilo persona mancante" };
  const admin = createServiceRoleClient();

  const clause_code = (formData.get("clause_code") as string)?.trim() || null;
  const clause_title = (formData.get("clause_title") as string)?.trim();
  const clause_text = (formData.get("clause_text") as string)?.trim() || null;
  const risk_type = (formData.get("risk_type") as string) || "altro";
  const severity = (formData.get("severity") as string) || "attenzione";
  const obligation = (formData.get("obligation") as string)?.trim() || null;
  if (!clause_title) return { error: "Titolo clausola obbligatorio" };

  const { data: created, error } = await admin
    .from("contract_clause")
    .insert({
      contract_id: contractId,
      project_id: projectId,
      company_id: companyId,
      clause_code, clause_title, clause_text, risk_type, severity, obligation,
      status: "da_chiarire",
      created_by: session.person.id,
      updated_by: session.person.id,
    })
    .select("id")
    .single();
  if (error || !created) return { error: error?.message ?? "Insert fallito" };

  await writeAuditLog({ entity_type: "contract_clause", entity_id: created.id, action: "create", new_values: { clause_title, risk_type, severity } });
  await canStartProject(projectId);
  revalidatePath(`/projects/${projectId}/contracts`);
  return { ok: true };
}
