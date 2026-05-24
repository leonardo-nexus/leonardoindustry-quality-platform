import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";

/**
 * Scansiona checklist completate e cerca item critici conformi SENZA evidenza
 * (no allegato + no live_evidence collegata).
 * Per ogni occorrenza:
 * - crea quality_block tipo allegato_mancante severity=critical
 * - notifica responsabile checklist
 *
 * Dedup via quality_event_log con event_type='evidence_missing_critical:<item_id>'.
 */
export async function checkMissingEvidence(): Promise<{ blocked: number; notified: number }> {
  const admin = createServiceRoleClient();
  let blocked = 0;
  let notified = 0;

  // Item critici conformi senza allegato_file_id
  const { data: items } = await admin
    .from("quality_checklist_item")
    .select("id, checklist_id, question, attachment_required, attachment_file_id, is_critical, result, compiled_at, checklist:checklist_id(id, code, status, responsible_id, plan_phase:plan_phase_id(plan:plan_id(project_id, company_id)))")
    .eq("is_critical", true)
    .eq("result", "conforme")
    .is("attachment_file_id", null)
    .eq("attachment_required", true)
    .limit(100);

  for (const it of items ?? []) {
    if (!it.compiled_at) continue;
    const chk: any = it.checklist;
    if (!chk || chk.status !== "completata") continue;

    const companyId = chk.plan_phase?.plan?.company_id;
    const projectId = chk.plan_phase?.plan?.project_id;
    if (!companyId) continue;

    // Dedup
    const { data: already } = await admin
      .from("quality_event_log")
      .select("id")
      .eq("event_type", `evidence_missing_critical:${it.id}`)
      .limit(1)
      .maybeSingle();
    if (already) continue;

    // Crea quality_block
    await admin.from("quality_block").insert({
      company_id: companyId,
      project_id: projectId,
      checklist_id: chk.id,
      type: "allegato_mancante",
      severity: "critical",
      description: `Item critico CONFORME senza evidenza in checklist ${chk.code}: "${it.question}"`,
      action_required: "Caricare foto/documento prova dell'item conforme",
      status: "aperto",
      opened_at: new Date().toISOString(),
    });
    blocked++;

    // Notifica responsabile
    if (chk.responsible_id) {
      await admin.from("notification").insert({
        company_id: companyId,
        project_id: projectId,
        source_type: "quality_checklist_item",
        source_id: it.id,
        severity: "critical",
        title: `Evidenza mancante: ${chk.code}`,
        message: `Item critico "${it.question.slice(0, 60)}" marcato CONFORME senza prova. Caricare foto/documento.`,
        action_url: `/quality-sentinel/checklists/${chk.id}`,
      });
      notified++;
    }

    // Dedup log
    await admin.from("quality_event_log").insert({
      company_id: companyId,
      project_id: projectId,
      source_type: "quality_checklist_item",
      source_id: it.id,
      event_type: `evidence_missing_critical:${it.id}`,
      severity: "critical",
      message: `Evidenza mancante item critico ${it.id}`,
    });
  }

  return { blocked, notified };
}
