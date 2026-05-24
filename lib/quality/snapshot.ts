import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { computeQualityScore } from "@/lib/quality/score";

/**
 * Crea snapshot daily quality_score per gruppo/impresa/commessa.
 * Idempotente: se già esiste lo aggiorna.
 */
export async function snapshotDailyScores(): Promise<{ created: number; updated: number }> {
  const admin = createServiceRoleClient();
  const today = new Date().toISOString().slice(0, 10);
  let created = 0;
  let updated = 0;

  // Per ogni impresa attiva
  const { data: companies } = await admin.from("company").select("id, name").eq("active", true);
  for (const c of companies ?? []) {
    const [{ count: blocks }, { count: nc }, { count: overdue }, { count: missing }, { data: losses }] = await Promise.all([
      admin.from("quality_block").select("id", { count: "exact", head: true }).eq("company_id", c.id).eq("status", "aperto"),
      admin.from("non_conformity").select("id", { count: "exact", head: true }).eq("company_id", c.id).neq("status", "chiusa"),
      admin.from("quality_checklist").select("id", { count: "exact", head: true }).eq("active", true).eq("status", "scaduta"),
      admin.from("quality_document_requirement").select("id", { count: "exact", head: true }).eq("status", "mancante"),
      admin.from("loss_event").select("estimated_loss_euro").eq("company_id", c.id).eq("status", "aperto"),
    ]);

    const totalLoss = (losses ?? []).reduce((s, l: any) => s + Number(l.estimated_loss_euro ?? 0), 0);

    const sc = computeQualityScore({
      checklist_total: Math.max((overdue ?? 0) + 10, 1),
      checklist_completed: 10,
      checklist_overdue: overdue ?? 0,
      tasks_total: 1, tasks_on_time: 1, tasks_overdue: 0,
      documents_required: 10, documents_ok: Math.max(10 - (missing ?? 0), 0), documents_missing: missing ?? 0, documents_expired: 0,
      nc_total: Math.max((nc ?? 0), 1), nc_closed_effective: 0, nc_critical_open: 0,
      evidence_total: 1, evidence_valid: 1,
      blocks_open: blocks ?? 0,
      audits_planned: 1, audits_executed: 1,
    });

    const row = {
      company_id: c.id,
      project_id: null,
      scope: "impresa" as const,
      snapshot_date: today,
      score: sc.score,
      level: sc.level,
      components: sc.components,
      blocks_open: blocks ?? 0,
      nc_open: nc ?? 0,
      overdue_checklists: overdue ?? 0,
      missing_docs: missing ?? 0,
      loss_open_euro: totalLoss,
    };

    const { data: existing } = await admin
      .from("quality_score_snapshot")
      .select("id")
      .eq("scope", "impresa")
      .eq("company_id", c.id)
      .eq("snapshot_date", today)
      .maybeSingle();
    if (existing) {
      await admin.from("quality_score_snapshot").update(row).eq("id", existing.id);
      updated++;
    } else {
      await admin.from("quality_score_snapshot").insert(row);
      created++;
    }
  }

  // Gruppo aggregato
  const { data: companyScores } = await admin
    .from("quality_score_snapshot")
    .select("score, blocks_open, nc_open, overdue_checklists, missing_docs, loss_open_euro")
    .eq("scope", "impresa")
    .eq("snapshot_date", today);
  if (companyScores && companyScores.length > 0) {
    const avg = Math.round(companyScores.reduce((s, x: any) => s + x.score, 0) / companyScores.length);
    const groupRow = {
      company_id: null,
      project_id: null,
      scope: "gruppo" as const,
      snapshot_date: today,
      score: avg,
      level: avg >= 90 ? "eccellente" : avg >= 75 ? "buono" : avg >= 60 ? "attenzione" : avg >= 40 ? "critico" : "fuori_controllo",
      components: null,
      blocks_open: companyScores.reduce((s, x: any) => s + (x.blocks_open ?? 0), 0),
      nc_open: companyScores.reduce((s, x: any) => s + (x.nc_open ?? 0), 0),
      overdue_checklists: companyScores.reduce((s, x: any) => s + (x.overdue_checklists ?? 0), 0),
      missing_docs: companyScores.reduce((s, x: any) => s + (x.missing_docs ?? 0), 0),
      loss_open_euro: companyScores.reduce((s, x: any) => s + Number(x.loss_open_euro ?? 0), 0),
    };
    const { data: existingG } = await admin
      .from("quality_score_snapshot")
      .select("id")
      .eq("scope", "gruppo")
      .is("company_id", null)
      .eq("snapshot_date", today)
      .maybeSingle();
    if (existingG) {
      await admin.from("quality_score_snapshot").update(groupRow).eq("id", existingG.id);
      updated++;
    } else {
      await admin.from("quality_score_snapshot").insert(groupRow);
      created++;
    }
  }

  return { created, updated };
}

/**
 * Recupera trend 30 giorni per scope.
 */
export async function getTrend30Days(scope: "gruppo" | "impresa", companyId?: string) {
  const admin = createServiceRoleClient();
  const from = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);
  let q: any = admin
    .from("quality_score_snapshot")
    .select("snapshot_date, score, blocks_open, nc_open, loss_open_euro")
    .eq("scope", scope)
    .gte("snapshot_date", from)
    .order("snapshot_date");
  if (companyId) q = q.eq("company_id", companyId);
  else if (scope === "gruppo") q = q.is("company_id", null);
  const { data } = await q;
  return data ?? [];
}
