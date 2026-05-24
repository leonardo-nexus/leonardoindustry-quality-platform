"use server";
import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { createLocalizedNotification, renderTemplate } from "@/lib/i18n/messages";

type Window = "T-7" | "T-3" | "T-1" | "T" | "T+1" | "T+3" | "T+7";

/**
 * Determina in quale finestra di escalation cade una due_date rispetto a oggi.
 * Restituisce null se siamo fuori da tutte le finestre tracciate.
 */
function escalationWindow(dueDate: string, today: Date): Window | null {
  const d = new Date(dueDate + "T00:00:00Z");
  const t = new Date(today.toISOString().slice(0, 10) + "T00:00:00Z");
  const days = Math.round((d.getTime() - t.getTime()) / 86400000);
  if (days === 7) return "T-7";
  if (days === 3) return "T-3";
  if (days === 1) return "T-1";
  if (days === 0) return "T";
  if (days === -1) return "T+1";
  if (days === -3) return "T+3";
  if (days === -7) return "T+7";
  return null;
}

function windowConfig(w: Window): { severity: "info" | "alert" | "critical"; title: string; escalateToDirection: boolean } {
  switch (w) {
    case "T-7": return { severity: "info",     title: "Promemoria (T-7)",       escalateToDirection: false };
    case "T-3": return { severity: "alert",    title: "Avviso (T-3)",           escalateToDirection: false };
    case "T-1": return { severity: "alert",    title: "Warning (T-1)",          escalateToDirection: false };
    case "T":   return { severity: "critical", title: "SCADUTO (T)",            escalateToDirection: false };
    case "T+1": return { severity: "critical", title: "Scaduto +1 giorno",      escalateToDirection: false };
    case "T+3": return { severity: "critical", title: "Escalation direzione impresa (T+3)", escalateToDirection: true };
    case "T+7": return { severity: "critical", title: "Escalation direzione gruppo (T+7)",  escalateToDirection: true };
  }
}

/**
 * Anti-duplicazione: emettiamo notifica per (entity_type, entity_id, window, day) solo una volta.
 * Usiamo quality_event_log come registro dedup con event_type="escalation:<window>".
 */
async function alreadyEmitted(admin: any, entityType: string, entityId: string, w: Window, todayStr: string): Promise<boolean> {
  const { data } = await admin
    .from("quality_event_log")
    .select("id")
    .eq("event_type", `escalation:${w}`)
    .eq("source_type", entityType)
    .eq("source_id", entityId)
    .gte("created_at", `${todayStr}T00:00:00Z`)
    .limit(1)
    .maybeSingle();
  return !!data;
}

async function recordEmitted(admin: any, entityType: string, entityId: string, w: Window, companyId: string | null, projectId: string | null, message: string) {
  await admin.from("quality_event_log").insert({
    company_id: companyId,
    project_id: projectId,
    source_type: entityType,
    source_id: entityId,
    event_type: `escalation:${w}`,
    severity: windowConfig(w).severity,
    message,
  });
}

/**
 * Esegue il pass di escalation completo T-7/T-3/T-1/T/T+1/T+3/T+7 su checklist + request + block.
 * - Dedup tramite quality_event_log (una emissione per (entity, window, giorno))
 * - T+ aggiorna status a 'scaduta'
 * - T+3/T+7 marca come escalation direzione
 */
export async function runQualityEscalationsAction(): Promise<{ ok?: boolean; error?: string; created?: number; escalated?: number; windows?: Record<string, number> }> {
  const supabase = createServiceRoleClient();
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  let created = 0;
  let escalated = 0;
  const windows: Record<string, number> = { "T-7": 0, "T-3": 0, "T-1": 0, "T": 0, "T+1": 0, "T+3": 0, "T+7": 0 };

  // 1. CHECKLIST con due_date
  const { data: checklists } = await supabase
    .from("quality_checklist")
    .select("id, code, title, due_date, status, plan_phase:plan_phase_id(plan:plan_id(project_id, company_id))")
    .not("due_date", "is", null)
    .neq("status", "completata")
    .neq("status", "non_conforme")
    .eq("active", true);

  for (const c of checklists ?? []) {
    const w = escalationWindow(c.due_date, today);
    if (!w) continue;
    if (await alreadyEmitted(supabase, "quality_checklist", c.id, w, todayStr)) continue;

    const company_id = (c as any).plan_phase?.plan?.company_id ?? null;
    const project_id = (c as any).plan_phase?.plan?.project_id ?? null;
    const cfg = windowConfig(w);
    const msg = `${cfg.title} · Checklist ${c.code} "${c.title}"`;

    // Aggiorna status su T (scaduta) - solo prima volta
    if (w === "T" && c.status !== "scaduta") {
      await supabase.from("quality_checklist").update({ status: "scaduta" }).eq("id", c.id);
    }

    await supabase.from("notification").insert({
      company_id, project_id,
      source_type: "quality_checklist",
      source_id: c.id,
      severity: cfg.severity,
      title: msg,
      message: cfg.escalateToDirection ? `${msg}. Escalation alla direzione.` : msg,
      action_url: `/quality-sentinel/checklists/${c.id}`,
      template_key: "alert.checklist_overdue",
      locale: "it",
    });
    await recordEmitted(supabase, "quality_checklist", c.id, w, company_id, project_id, msg);
    created++;
    if (cfg.escalateToDirection) escalated++;
    windows[w]++;
  }

  // 2. RICHIESTE documentali
  const { data: requests } = await supabase
    .from("quality_request")
    .select("id, subject, due_date, status, company_id, project_id, reminders_sent")
    .not("due_date", "is", null)
    .in("status", ["inviata", "sollecitata"])
    .eq("active", true);

  for (const r of requests ?? []) {
    const w = escalationWindow(r.due_date, today);
    if (!w) continue;
    if (await alreadyEmitted(supabase, "quality_request", r.id, w, todayStr)) continue;
    const cfg = windowConfig(w);
    const msg = `${cfg.title} · Richiesta "${r.subject}"`;

    if (w === "T") {
      await supabase.from("quality_request").update({
        status: "scaduta",
        reminders_sent: (r.reminders_sent ?? 0) + 1,
        last_reminded_at: new Date().toISOString(),
      }).eq("id", r.id);
    } else {
      await supabase.from("quality_request").update({
        reminders_sent: (r.reminders_sent ?? 0) + 1,
        last_reminded_at: new Date().toISOString(),
      }).eq("id", r.id);
    }

    await supabase.from("notification").insert({
      company_id: r.company_id, project_id: (r as any).project_id ?? null,
      source_type: "quality_request",
      source_id: r.id,
      severity: cfg.severity,
      title: msg,
      message: cfg.escalateToDirection ? `${msg}. Escalation alla direzione.` : msg,
      action_url: "/quality-sentinel",
    });
    await recordEmitted(supabase, "quality_request", r.id, w, r.company_id, (r as any).project_id ?? null, msg);
    created++;
    if (cfg.escalateToDirection) escalated++;
    windows[w]++;
  }

  // 3. BLOCKS aperti da N giorni → finestre T+1/T+3/T+7 calcolate da opened_at
  const { data: blocks } = await supabase
    .from("quality_block")
    .select("id, type, severity, description, company_id, project_id, opened_at")
    .eq("status", "aperto")
    .eq("active", true);
  for (const b of blocks ?? []) {
    const opened = new Date(b.opened_at);
    const ageDays = Math.floor((today.getTime() - opened.getTime()) / 86400000);
    let w: Window | null = null;
    if (ageDays === 1) w = "T+1";
    else if (ageDays === 3) w = "T+3";
    else if (ageDays === 7) w = "T+7";
    if (!w) continue;
    if (await alreadyEmitted(supabase, "quality_block", b.id, w, todayStr)) continue;
    const cfg = windowConfig(w);
    const msg = `${cfg.title} · Blocco "${b.type}" aperto da ${ageDays}g`;

    await supabase.from("notification").insert({
      company_id: b.company_id, project_id: b.project_id,
      source_type: "quality_block",
      source_id: b.id,
      severity: cfg.severity,
      title: msg,
      message: `${b.description}${cfg.escalateToDirection ? "\n\nEscalation alla direzione." : ""}`,
      action_url: "/quality-sentinel/executive",
    });
    await recordEmitted(supabase, "quality_block", b.id, w, b.company_id, b.project_id, msg);
    created++;
    if (cfg.escalateToDirection) escalated++;
    windows[w]++;
  }

  revalidatePath("/quality-sentinel");
  revalidatePath("/notifications");
  revalidatePath("/quality-sentinel/reports");
  return { ok: true, created, escalated, windows };
}
