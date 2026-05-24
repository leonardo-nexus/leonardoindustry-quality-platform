"use server";
import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";

export async function generateQualityPlanAction(projectId: string, templateId: string) {
  const session = await requireSession();
  if (!session.person) return { error: "Profilo persona mancante" };

  const supabase = await createServerClient();

  // 1. Verifica project + recupera company_id
  const { data: project, error: prjErr } = await supabase
    .from("project")
    .select("id, company_id, code")
    .eq("id", projectId)
    .maybeSingle();
  if (prjErr || !project) return { error: "Commessa non trovata" };

  // 2. Verifica template + country
  const { data: template } = await supabase
    .from("quality_template")
    .select("id, country")
    .eq("id", templateId)
    .maybeSingle();
  if (!template) return { error: "Template non trovato" };

  // 3. Verifica che non esista già un piano
  const { data: existing } = await supabase.from("quality_plan").select("id").eq("project_id", projectId).maybeSingle();
  if (existing) return { error: "Piano qualità già esistente per questa commessa" };

  // 4. Crea quality_plan
  const { data: plan, error: planErr } = await supabase
    .from("quality_plan")
    .insert({
      project_id: projectId,
      company_id: project.company_id,
      template_id: templateId,
      responsible_qa_id: session.person.id,
      country: template.country,
      status: "attivo",
      generated_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (planErr) return { error: `Plan: ${planErr.message}` };

  // 5. Recupera fasi del template
  const { data: tplPhases } = await supabase
    .from("quality_template_phase")
    .select("id, code, name, ordering, default_duration_days")
    .eq("template_id", templateId)
    .order("ordering");

  if (!tplPhases || tplPhases.length === 0) {
    return { error: "Template senza fasi" };
  }

  // 6. Crea quality_plan_phase per ogni template_phase
  const today = new Date();
  let cumulativeDays = 0;
  const phaseIds: { tplPhaseId: string; planPhaseId: string }[] = [];
  for (const tp of tplPhases) {
    const start = new Date(today);
    start.setDate(today.getDate() + cumulativeDays);
    cumulativeDays += tp.default_duration_days ?? 14;
    const due = new Date(today);
    due.setDate(today.getDate() + cumulativeDays);
    const { data: pp, error: ppErr } = await supabase
      .from("quality_plan_phase")
      .insert({
        plan_id: plan.id,
        template_phase_id: tp.id,
        code: tp.code,
        name: tp.name,
        ordering: tp.ordering,
        start_date: start.toISOString().slice(0, 10),
        due_date: due.toISOString().slice(0, 10),
      })
      .select("id")
      .single();
    if (ppErr) return { error: `Phase ${tp.code}: ${ppErr.message}` };
    phaseIds.push({ tplPhaseId: tp.id, planPhaseId: pp.id });
  }

  // 7. Recupera checklist template per ogni phase + crea quality_checklist + items
  let checklistsCreated = 0;
  for (const { tplPhaseId, planPhaseId } of phaseIds) {
    const { data: tplChks } = await supabase
      .from("quality_template_checklist")
      .select("*")
      .eq("phase_id", tplPhaseId)
      .eq("active", true)
      .order("ordering");
    for (const tc of tplChks ?? []) {
      // Calcola due_date dalla phase start + offset
      let dueDate: string | null = null;
      if (tc.due_offset_days) {
        const { data: pp } = await supabase.from("quality_plan_phase").select("start_date").eq("id", planPhaseId).single();
        if (pp?.start_date) {
          const d = new Date(pp.start_date);
          d.setDate(d.getDate() + tc.due_offset_days);
          dueDate = d.toISOString().slice(0, 10);
        }
      }
      const { data: chk, error: chkErr } = await supabase
        .from("quality_checklist")
        .insert({
          plan_phase_id: planPhaseId,
          template_checklist_id: tc.id,
          code: tc.code,
          title: tc.title,
          due_date: dueDate,
          required: tc.required,
          signature_required: tc.signature_required,
          related_procedure_code: tc.related_procedure_code,
          related_form_code: tc.related_form_code,
        })
        .select("id")
        .single();
      if (chkErr) continue;

      // Crea un item generico per ogni allegato richiesto
      const items: any[] = [];
      const attachments = tc.attachments_required as string[] | null;
      if (attachments && attachments.length > 0) {
        attachments.forEach((att, i) => {
          items.push({
            checklist_id: chk.id,
            ordering: i,
            question: `Allegare: ${att.replace(/_/g, " ")}`,
            required: true,
            is_critical: false,
            attachment_required: true,
            expected_evidence: att,
          });
        });
      } else {
        // Fallback: 1 item generico "Esecuzione completata"
        items.push({
          checklist_id: chk.id,
          ordering: 0,
          question: tc.description || tc.title,
          required: true,
          is_critical: false,
        });
      }
      if (items.length > 0) await supabase.from("quality_checklist_item").insert(items);
      checklistsCreated++;
    }
  }

  // 8. Log evento
  await supabase.from("quality_event_log").insert({
    company_id: project.company_id,
    project_id: projectId,
    plan_id: plan.id,
    event_type: "plan_created",
    actor_id: session.person.id,
    target_table: "quality_plan",
    target_id: plan.id,
    message: `Piano qualità generato per commessa ${project.code} con template ${templateId}`,
    metadata: { template_id: templateId, phases: tplPhases.length, checklists: checklistsCreated },
  });

  revalidatePath(`/quality-sentinel/plans/${projectId}`);
  revalidatePath(`/quality-sentinel`);
  return { ok: true, planId: plan.id, phases: tplPhases.length, checklists: checklistsCreated };
}
