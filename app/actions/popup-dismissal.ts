"use server";
import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/audit/audit-log";

export async function dismissPopupAction(kind: string, entityId: string, reason: string) {
  const session = await requireSession();
  if (!session.person) return { error: "Profilo persona mancante" };
  if (!reason || reason.trim().length < 3) return { error: "Motivo obbligatorio per ignorare un alert (min 3 caratteri)" };

  const admin = createServiceRoleClient();
  await admin.from("popup_dismissal").upsert({
    person_id: session.person.id,
    kind, entity_id: entityId,
    action: "dismiss",
    reason,
  }, { onConflict: "person_id,kind,entity_id,action" });

  await writeAuditLog({
    entity_type: kind,
    entity_id: entityId,
    action: "dismiss",
    reason,
    reason_type: "popup_dismiss",
  });

  revalidatePath("/");
  return { ok: true };
}

export async function snoozePopupAction(kind: string, entityId: string, hours: number, reason?: string) {
  const session = await requireSession();
  if (!session.person) return { error: "Profilo persona mancante" };
  if (hours < 1 || hours > 168) return { error: "Snooze: 1–168 ore" };

  const until = new Date(Date.now() + hours * 3600_000).toISOString();
  const admin = createServiceRoleClient();
  await admin.from("popup_dismissal").upsert({
    person_id: session.person.id,
    kind, entity_id: entityId,
    action: "snooze",
    snooze_until: until,
    reason: reason ?? `Snooze ${hours}h`,
  }, { onConflict: "person_id,kind,entity_id,action" });

  await writeAuditLog({
    entity_type: kind,
    entity_id: entityId,
    action: "snooze",
    reason: `${hours}h${reason ? `: ${reason}` : ""}`,
    reason_type: "popup_snooze",
  });

  revalidatePath("/");
  return { ok: true, until };
}
