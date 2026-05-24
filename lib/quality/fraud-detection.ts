import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";

export interface FraudFlags {
  too_fast?: boolean;
  all_same_answer?: boolean;
  no_evidence_critical?: boolean;
  multiple_in_minute?: boolean;
  out_of_time_window?: boolean;
  duplicate_photo?: boolean;
  details: string[];
}

/**
 * Calcola suspicion_flags per una checklist completata e aggiorna i campi su quality_checklist.
 * Da chiamare dentro completeChecklistAction.
 */
export async function computeChecklistSuspicion(checklistId: string): Promise<FraudFlags> {
  const admin = createServiceRoleClient();
  const flags: FraudFlags = { details: [] };
  let score = 0;

  const { data: chk } = await admin
    .from("quality_checklist")
    .select("id, created_at, completed_at, status, responsible_id")
    .eq("id", checklistId)
    .maybeSingle();
  if (!chk) return flags;

  // 1. Completamento troppo rapido (< 30 secondi)
  if (chk.created_at && chk.completed_at) {
    const seconds = (new Date(chk.completed_at).getTime() - new Date(chk.created_at).getTime()) / 1000;
    if (seconds < 30) {
      flags.too_fast = true;
      flags.details.push(`Checklist completata in ${seconds.toFixed(0)}s (sospettosamente rapida)`);
      score += 30;
    }
    await admin.from("quality_checklist").update({ completion_seconds: Math.floor(seconds) }).eq("id", checklistId);
  }

  // 2. Tutte risposte uguali senza note
  const { data: items } = await admin
    .from("quality_checklist_item")
    .select("result, notes, is_critical, attachment_file_id")
    .eq("checklist_id", checklistId);

  if (items && items.length >= 3) {
    const uniqueResults = new Set(items.map((i: any) => i.result));
    const allWithoutNotes = items.every((i: any) => !i.notes || i.notes.trim().length < 3);
    if (uniqueResults.size === 1 && allWithoutNotes) {
      flags.all_same_answer = true;
      flags.details.push(`Tutte ${items.length} risposte identiche senza note`);
      score += 25;
    }

    // 3. Item critici conformi senza evidenza
    const criticalNoEvidence = items.filter((i: any) => i.is_critical && i.result === "conforme" && !i.attachment_file_id);
    if (criticalNoEvidence.length > 0) {
      flags.no_evidence_critical = true;
      flags.details.push(`${criticalNoEvidence.length} item critici conformi senza foto/evidenza`);
      score += 20;
    }
  }

  // 4. Multiple checklist completate dallo stesso utente nello stesso minuto
  if (chk.responsible_id && chk.completed_at) {
    const t = new Date(chk.completed_at);
    const fromIso = new Date(t.getTime() - 60_000).toISOString();
    const toIso = new Date(t.getTime() + 60_000).toISOString();
    const { count } = await admin
      .from("quality_checklist")
      .select("id", { count: "exact", head: true })
      .eq("responsible_id", chk.responsible_id)
      .gte("completed_at", fromIso)
      .lte("completed_at", toIso);
    if ((count ?? 0) > 3) {
      flags.multiple_in_minute = true;
      flags.details.push(`${count} checklist firmate dallo stesso utente entro 2 min`);
      score += 15;
    }
  }

  // 5. Foto duplicate (basato su live_evidence con suspicion_flags duplicate_sha256)
  if (chk.id) {
    const { data: dupes } = await admin
      .from("live_evidence")
      .select("id")
      .eq("checklist_id", checklistId)
      .contains("suspicion_flags", ["duplicate_sha256"]);
    if (dupes && dupes.length > 0) {
      flags.duplicate_photo = true;
      flags.details.push(`${dupes.length} foto duplicate (SHA256 già usato)`);
      score += 10;
    }
  }

  // Salva flags + score
  await admin.from("quality_checklist").update({
    suspicion_score: Math.min(100, score),
    suspicion_flags: flags,
  }).eq("id", checklistId);

  // Log evento se score elevato
  if (score >= 30) {
    await admin.from("quality_event_log").insert({
      source_type: "quality_checklist",
      source_id: checklistId,
      event_type: "compilazione_sospetta",
      severity: score >= 50 ? "critical" : "alert",
      message: `Checklist sospetta (score ${score}): ${flags.details.join(" · ")}`,
    });
  }

  return flags;
}

/**
 * Dashboard "Compilazioni sospette" — recupera checklist con suspicion_score elevato.
 */
export async function listSuspiciousChecklists(limit = 50) {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("quality_checklist")
    .select("id, code, title, suspicion_score, suspicion_flags, completion_seconds, completed_at, responsible:responsible_id(first_name, last_name)")
    .gte("suspicion_score", 30)
    .order("suspicion_score", { ascending: false })
    .limit(limit);
  return data ?? [];
}
