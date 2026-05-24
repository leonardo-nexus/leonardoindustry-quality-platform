"use server";
import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/audit/audit-log";

export async function saveExtractedTextAction(ocrId: string, rawText: string, extractedFields: Record<string, unknown>) {
  const session = await requireSession();
  if (!session.person) return { error: "Profilo persona mancante" };
  const admin = createServiceRoleClient();
  await admin.from("ocr_extraction").update({
    raw_text: rawText,
    extracted_fields: extractedFields,
    status: "processato",
    processed_at: new Date().toISOString(),
  }).eq("id", ocrId);
  await writeAuditLog({ entity_type: "ocr_extraction", entity_id: ocrId, action: "update", reason_type: "transcrizione" });
  revalidatePath(`/ocr/${ocrId}`);
  return { ok: true };
}

export async function verifyOcrAction(ocrId: string) {
  const session = await requireSession();
  if (!session.person) return { error: "Profilo persona mancante" };
  const admin = createServiceRoleClient();
  await admin.from("ocr_extraction").update({
    status: "verificato_manualmente",
    verified_by: session.person.id,
    verified_at: new Date().toISOString(),
  }).eq("id", ocrId);
  await writeAuditLog({ entity_type: "ocr_extraction", entity_id: ocrId, action: "approve" });
  revalidatePath(`/ocr/${ocrId}`);
  return { ok: true };
}
