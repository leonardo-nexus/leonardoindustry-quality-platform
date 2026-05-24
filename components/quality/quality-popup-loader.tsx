import { createServerClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";
import { QualityPopupManager, type QualityPopupItem } from "./quality-popup-manager";

// Server component: fetches active blocks / overdue requests / critical NCs
// for the current user's company and embeds the popup manager.
export async function QualityPopupLoader() {
  const session = await requireSession();
  if (!session.person?.company_id) return null;
  const supabase = await createServerClient();
  const companyId = session.person.company_id;
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: blocks }, { data: ncCrit }, { data: reqOver }, { data: lossBlockers }] = await Promise.all([
    supabase
      .from("quality_block")
      .select("id, type, severity, description, opened_at, action_required, project:project_id(code, name), company:company_id(name)")
      .eq("company_id", companyId)
      .eq("status", "aperto")
      .in("severity", ["critical", "block"])
      .order("opened_at", { ascending: false })
      .limit(5),
    supabase
      .from("non_conformity")
      .select("id, title, description, severity, detected_at, project:project_id(code), company:company_id(name)")
      .eq("company_id", companyId)
      .eq("severity", "critica")
      .neq("status", "chiusa")
      .order("detected_at", { ascending: false })
      .limit(5),
    supabase
      .from("quality_request")
      .select("id, subject, description, due_date, company:company_id(name)")
      .eq("company_id", companyId)
      .lt("due_date", today)
      .in("status", ["inviata", "sollecitata"])
      .order("due_date")
      .limit(5),
    supabase
      .from("loss_event")
      .select("id, category, severity, title, description, estimated_loss_euro, created_at, project:project_id(code), company:company_id(name)")
      .eq("company_id", companyId)
      .in("severity", ["critico", "blocco"])
      .eq("status", "aperto")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const items: QualityPopupItem[] = [];

  for (const b of blocks ?? []) {
    items.push({
      id: b.id,
      kind: "block",
      severity: b.severity,
      title: `Blocco operativo: ${b.type.replace(/_/g, " ")}`,
      description: [b.description, b.action_required ? `\nAzione richiesta: ${b.action_required}` : ""].filter(Boolean).join(""),
      action_url: "/quality-sentinel/executive",
      company_name: (b as any).company?.name ?? null,
      project_code: (b as any).project?.code ?? null,
      opened_at: b.opened_at,
    });
  }
  for (const nc of ncCrit ?? []) {
    items.push({
      id: nc.id,
      kind: "nc_critical",
      severity: nc.severity,
      title: `NC critica aperta: ${nc.title}`,
      description: nc.description ?? null,
      action_url: `/non-conformities/${nc.id}`,
      company_name: (nc as any).company?.name ?? null,
      project_code: (nc as any).project?.code ?? null,
      opened_at: nc.detected_at,
    });
  }
  for (const r of reqOver ?? []) {
    items.push({
      id: r.id,
      kind: "request_overdue",
      severity: "alert",
      title: `Richiesta documentale scaduta: ${r.subject}`,
      description: r.description ?? "Richiesta documentale oltre la scadenza. Sollecitare il destinatario.",
      action_url: "/quality-sentinel",
      company_name: (r as any).company?.name ?? null,
      project_code: null,
      opened_at: r.due_date,
    });
  }
  for (const le of lossBlockers ?? []) {
    items.push({
      id: le.id,
      kind: "loss_prevention",
      severity: le.severity,
      title: le.title,
      description: le.description ?? null,
      action_url: "/quality-sentinel/risk",
      company_name: (le as any).company?.name ?? null,
      project_code: (le as any).project?.code ?? null,
      opened_at: le.created_at,
      estimated_loss_euro: le.estimated_loss_euro ? Number(le.estimated_loss_euro) : null,
    });
  }

  // Filtra via i popup dismissati o snoozzati ancora attivi per questa persona
  if (items.length > 0 && session.person) {
    const { data: dismissals } = await supabase
      .from("popup_dismissal")
      .select("kind, entity_id, action, snooze_until")
      .eq("person_id", session.person.id);
    const now = Date.now();
    const blockedKeys = new Set<string>();
    for (const d of dismissals ?? []) {
      const key = `${d.kind}:${d.entity_id}`;
      if (d.action === "dismiss") blockedKeys.add(key);
      else if (d.action === "snooze" && d.snooze_until && new Date(d.snooze_until).getTime() > now) blockedKeys.add(key);
    }
    if (blockedKeys.size > 0) {
      const filtered = items.filter((i) => !blockedKeys.has(`${i.kind}:${i.id}`));
      if (filtered.length === 0) return null;
      return <QualityPopupManager items={filtered} />;
    }
  }

  if (items.length === 0) return null;
  return <QualityPopupManager items={items} />;
}
