"use server";
import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";

export async function setItemResultAction(itemId: string, result: string, notes?: string) {
  const session = await requireSession();
  if (!session.person) return { error: "Profilo persona mancante" };

  const supabase = await createServerClient();
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
