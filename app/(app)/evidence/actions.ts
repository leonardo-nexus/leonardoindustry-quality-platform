"use server";
import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/audit/audit-log";

export async function approveEvidenceAction(evidenceId: string) {
  const session = await requireSession();
  if (!session.person) return { error: "Profilo persona mancante" };
  const admin = createServiceRoleClient();
  await admin.from("live_evidence").update({
    verification_status: "verificata",
    verified_by: session.person.id,
    verified_at: new Date().toISOString(),
  }).eq("id", evidenceId);
  await writeAuditLog({ entity_type: "live_evidence", entity_id: evidenceId, action: "approve" });
  revalidatePath(`/evidence/${evidenceId}`);
  revalidatePath("/evidence");
  return { ok: true };
}

export async function rejectEvidenceAction(evidenceId: string, reason: string) {
  const session = await requireSession();
  if (!session.person) return { error: "Profilo persona mancante" };
  if (!reason || reason.trim().length < 3) return { error: "Motivo obbligatorio" };
  const admin = createServiceRoleClient();
  await admin.from("live_evidence").update({
    verification_status: "respinta",
    verified_by: session.person.id,
    verified_at: new Date().toISOString(),
    notes: reason,
  }).eq("id", evidenceId);
  await writeAuditLog({ entity_type: "live_evidence", entity_id: evidenceId, action: "reject", reason });
  revalidatePath(`/evidence/${evidenceId}`);
  return { ok: true };
}
