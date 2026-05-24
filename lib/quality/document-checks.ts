// Motore congruenza documentale per Quality Sentinel
// Analizza quality_document_requirement vs document esistenti, crea quality_document_check
import { createServiceRoleClient } from "@/lib/supabase/server";

export interface DocumentCheckResult {
  check_type: string;
  severity: "warning" | "alert" | "block" | "critical";
  message: string;
  action_suggested: string;
  target_requirement_id?: string;
  target_document_id?: string;
}

export async function runQualityDocumentChecks(planId: string): Promise<{
  total: number;
  checks: DocumentCheckResult[];
  blocks_created: number;
}> {
  const supabase = createServiceRoleClient();
  const results: DocumentCheckResult[] = [];

  // 1. Recupera plan + project
  const { data: plan } = await supabase
    .from("quality_plan")
    .select("id, project_id, company_id")
    .eq("id", planId)
    .single();
  if (!plan) return { total: 0, checks: [], blocks_created: 0 };

  const today = new Date().toISOString().slice(0, 10);

  // 2. Documenti mancanti dalla quality_document_requirement
  const { data: requirements } = await supabase
    .from("quality_document_requirement")
    .select("id, code, title, status, due_date, required")
    .eq("plan_id", planId)
    .eq("active", true);

  for (const r of requirements ?? []) {
    if (r.status === "mancante") {
      const isOverdue = r.due_date && r.due_date < today;
      results.push({
        check_type: "documento_mancante",
        severity: isOverdue ? "block" : r.required ? "alert" : "warning",
        message: `Documento mancante: ${r.code} — ${r.title}${isOverdue ? " (scadenza passata)" : ""}`,
        action_suggested: `Caricare il documento o creare richiesta verso il responsabile.`,
        target_requirement_id: r.id,
      });
    }
  }

  // 3. Documenti scaduti: revisioni con next_review_date < oggi e is_current=true
  const { data: expiredRevs } = await supabase
    .from("document_revision")
    .select("id, document_id, next_review_date, document:document_id(id, code, title, company_id, status)")
    .eq("is_current", true)
    .lt("next_review_date", today)
    .limit(50);

  for (const rev of expiredRevs ?? []) {
    if ((rev as any).document?.company_id !== plan.company_id) continue;
    results.push({
      check_type: "documento_scaduto",
      severity: "alert",
      message: `Documento ${(rev as any).document?.code} scaduto: revisione del ${rev.next_review_date}`,
      action_suggested: "Caricare nuova revisione aggiornata.",
      target_document_id: rev.document_id,
    });
  }

  // 4. Documenti obsoleti ancora attivi nelle procedure (con status=obsoleto)
  const { data: obsoleteDocs } = await supabase
    .from("document")
    .select("id, code, title, status")
    .eq("company_id", plan.company_id)
    .eq("status", "obsoleto")
    .eq("active", true)
    .limit(50);

  for (const d of obsoleteDocs ?? []) {
    results.push({
      check_type: "documento_obsoleto",
      severity: "warning",
      message: `Documento ${d.code} marcato obsoleto ma ancora attivo`,
      action_suggested: "Archiviare il documento o caricare la nuova revisione.",
      target_document_id: d.id,
    });
  }

  // 5. Salva i check nel DB (cancella i vecchi non risolti dello stesso tipo per evitare duplicati)
  await supabase
    .from("quality_document_check")
    .delete()
    .eq("plan_id", planId)
    .is("resolved_at", null);

  if (results.length > 0) {
    await supabase.from("quality_document_check").insert(
      results.map((r) => ({
        plan_id: planId,
        check_type: r.check_type,
        target_requirement_id: r.target_requirement_id,
        target_document_id: r.target_document_id,
        severity: r.severity,
        message: r.message,
        action_suggested: r.action_suggested,
      })),
    );
  }

  // 6. Crea blocchi quality_block per check con severity 'block' o 'critical'
  let blocks_created = 0;
  for (const r of results.filter((x) => x.severity === "block" || x.severity === "critical")) {
    const blockType =
      r.check_type === "documento_mancante" ? "documento_mancante"
      : r.check_type === "documento_scaduto" ? "documento_scaduto"
      : r.check_type === "documento_obsoleto" ? "documento_obsoleto"
      : "altro";
    const { error } = await supabase.from("quality_block").insert({
      company_id: plan.company_id,
      project_id: plan.project_id,
      plan_id: planId,
      type: blockType,
      severity: r.severity,
      description: r.message,
      action_required: r.action_suggested,
    });
    if (!error) blocks_created++;
  }

  return { total: results.length, checks: results, blocks_created };
}
