"use server";
import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";

// Esegue il pass di escalation: T-7, T-3, T-1, T, T+1, T+3, T+7
// Crea reminder/alert/NC gestionale/escalation in base alle scadenze
export async function runQualityEscalationsAction(): Promise<{ ok?: boolean; error?: string; created?: number; escalated?: number }> {
  const supabase = createServiceRoleClient();
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  let created = 0;
  let escalated = 0;

  // 1. Checklist con due_date < oggi e non chiuse → status = scaduta
  const { data: overdue } = await supabase
    .from("quality_checklist")
    .select("id, code, title, plan_phase:plan_phase_id(plan:plan_id(project_id, company_id))")
    .lt("due_date", todayStr)
    .in("status", ["non_avviata", "in_corso"])
    .eq("active", true);
  for (const c of overdue ?? []) {
    await supabase.from("quality_checklist").update({ status: "scaduta" }).eq("id", c.id);
    const company_id = (c as any).plan_phase?.plan?.company_id;
    const project_id = (c as any).plan_phase?.plan?.project_id;
    if (company_id) {
      await supabase.from("notification").insert({
        company_id,
        project_id,
        source_type: "quality_checklist",
        source_id: c.id,
        severity: "alert",
        title: `Checklist scaduta: ${c.code}`,
        message: `La checklist "${c.title}" è scaduta e richiede azione immediata.`,
        action_url: `/quality-sentinel/checklists/${c.id}`,
      });
      created++;
      escalated++;
    }
  }

  // 2. Richieste documentali scadute → status = scaduta
  const { data: lateRequests } = await supabase
    .from("quality_request")
    .select("id, subject, company_id, recipient_person_id, reminders_sent")
    .lt("due_date", todayStr)
    .in("status", ["inviata", "sollecitata"])
    .eq("active", true);
  for (const r of lateRequests ?? []) {
    await supabase.from("quality_request").update({
      status: "scaduta",
      reminders_sent: (r.reminders_sent ?? 0) + 1,
      last_reminded_at: new Date().toISOString(),
    }).eq("id", r.id);
    await supabase.from("notification").insert({
      company_id: r.company_id,
      source_type: "quality_request",
      source_id: r.id,
      severity: "critical",
      title: `Richiesta scaduta: ${r.subject}`,
      message: `La richiesta documentale "${r.subject}" è scaduta. Escalation alla direzione.`,
      action_url: `/quality-sentinel`,
    });
    created++;
    escalated++;
  }

  // 3. Quality block aperti da > 3 giorni → escalation visibile
  const threeDaysAgo = new Date(today);
  threeDaysAgo.setDate(today.getDate() - 3);
  const { data: oldBlocks } = await supabase
    .from("quality_block")
    .select("id, type, severity, description, company_id, project_id")
    .eq("status", "aperto")
    .lt("opened_at", threeDaysAgo.toISOString());
  for (const b of oldBlocks ?? []) {
    await supabase.from("notification").insert({
      company_id: b.company_id,
      project_id: b.project_id,
      source_type: "quality_block",
      source_id: b.id,
      severity: "critical",
      title: `Blocco operativo aperto da oltre 3 giorni: ${b.type}`,
      message: b.description,
      action_url: "/quality-sentinel/executive",
    });
    created++;
    escalated++;
  }

  revalidatePath("/quality-sentinel");
  revalidatePath("/notifications");
  revalidatePath("/quality-sentinel/reports");
  return { ok: true, created, escalated };
}
