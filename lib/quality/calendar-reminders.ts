import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";

/**
 * Emette reminder progressivi per calendar_event in finestre T-30/T-15/T-7/T-3/T-1/T/T+1/T+3/T+7.
 * Usa reminder_emission per evitare duplicati.
 */
export async function emitCalendarReminders(): Promise<{ emitted: number; windows: Record<string, number> }> {
  const admin = createServiceRoleClient();
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const windows: Record<string, number> = {};
  let emitted = 0;

  // Carica eventi con scheduled_date entro ±30gg
  const start = new Date(today); start.setDate(today.getDate() - 30);
  const end = new Date(today); end.setDate(today.getDate() + 60);

  const { data: events } = await admin
    .from("calendar_event")
    .select("*, responsible:responsible_id(id, first_name, last_name, locale)")
    .gte("scheduled_date", start.toISOString().slice(0, 10))
    .lte("scheduled_date", end.toISOString().slice(0, 10))
    .neq("status", "annullato")
    .neq("status", "completato");

  for (const e of events ?? []) {
    const due = new Date((e.scheduled_date as string) + "T00:00:00Z");
    const todayUtc = new Date(today.toISOString().slice(0, 10) + "T00:00:00Z");
    const daysToDue = Math.round((due.getTime() - todayUtc.getTime()) / 86400000);
    const thresholds: number[] = e.reminder_thresholds_days ?? [30, 15, 7, 3, 1, 0, -1, -3, -7];
    // Cerca threshold corrispondente esatto
    if (!thresholds.includes(daysToDue)) continue;

    // Dedup
    const { data: already } = await admin
      .from("reminder_emission")
      .select("id")
      .eq("calendar_event_id", e.id)
      .eq("threshold_days", daysToDue)
      .limit(1)
      .maybeSingle();
    if (already) continue;

    // Determina severity da threshold
    let severity: "info" | "alert" | "critical" = "info";
    if (daysToDue <= 1 && daysToDue >= 0) severity = "alert";
    if (daysToDue < 0) severity = "critical";

    const label = daysToDue > 0 ? `T-${daysToDue}` : daysToDue === 0 ? "T (oggi)" : `T+${Math.abs(daysToDue)}`;
    const title = `${label} · ${e.title}`;
    const message = daysToDue >= 0
      ? `Scadenza ${e.event_type} il ${e.scheduled_date}. ${e.description ?? ""}`
      : `SCADUTA da ${Math.abs(daysToDue)} giorni: ${e.title}`;

    await admin.from("notification").insert({
      company_id: e.company_id,
      project_id: e.project_id,
      source_type: "calendar_event",
      source_id: e.id,
      severity,
      title, message,
      action_url: `/calendar`,
      template_key: "alert.calendar_reminder",
      locale: (e as any).responsible?.locale ?? "it",
    });

    await admin.from("reminder_emission").insert({
      calendar_event_id: e.id,
      threshold_days: daysToDue,
    });

    emitted++;
    const key = label;
    windows[key] = (windows[key] ?? 0) + 1;

    // T+3 → escalation responsabile_commessa + direzione impresa
    if (daysToDue === -3) {
      await admin.from("notification").insert({
        company_id: e.company_id,
        project_id: e.project_id,
        source_type: "calendar_event",
        source_id: e.id,
        severity: "critical",
        title: `Escalation T+3 direzione: ${e.title}`,
        message: `Scadenza non gestita da 3 giorni. Escalation direzione impresa.`,
        action_url: `/calendar`,
      });
    }
    // T+7 → escalation direzione gruppo
    if (daysToDue === -7) {
      await admin.from("notification").insert({
        company_id: e.company_id,
        project_id: e.project_id,
        source_type: "calendar_event",
        source_id: e.id,
        severity: "critical",
        title: `Escalation T+7 direzione gruppo: ${e.title}`,
        message: `Scadenza non gestita da 7 giorni. Escalation direzione gruppo.`,
        action_url: `/calendar`,
      });
    }
    // Aggiorna stato evento
    if (daysToDue === 0) await admin.from("calendar_event").update({ status: "scaduto" }).eq("id", e.id);
  }

  return { emitted, windows };
}
