"use server";
import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";
import { logUpdate, logDelete, writeAuditLog } from "./audit-log";
import { createEntityRevision } from "./revisions";

// Whitelist tabelle modificabili da generic actions (sicurezza)
const ALLOWED_ENTITIES = new Set([
  "non_conformity",
  "document",
  "quality_plan",
  "quality_plan_phase",
  "quality_checklist",
  "quality_checklist_item",
  "quality_request",
  "quality_block",
  "asset",
  "wps",
  "wpqr",
  "welder_qualification",
  "form_template",
  "process",
  "national_requirement",
  "corrective_action",
  "contract",
  "contract_clause",
  "technical_sheet",
  "material_lot",
]);

// Tabelle che devono creare entity_revision a ogni update significativo
const REVISIONABLE = new Set([
  "document",
  "quality_plan",
  "quality_checklist",
  "form_template",
  "wps",
  "wpqr",
  "welder_qualification",
  "national_requirement",
  "contract",
  "technical_sheet",
]);

// Tabelle che NON possono essere eliminate se referenziate (forza archive)
const ARCHIVE_ONLY_IF_USED = new Set([
  "document",
  "wps",
  "wpqr",
  "person",
  "quality_checklist",
]);

function ensureAllowed(entityType: string) {
  if (!ALLOWED_ENTITIES.has(entityType)) {
    throw new Error(`Entity '${entityType}' non gestita da generic-actions`);
  }
}

export async function genericUpdateAction(
  entityType: string,
  entityId: string,
  patch: Record<string, unknown>,
  reason: string,
  reasonType: string,
  revalidateUrls: string[] = [],
) {
  ensureAllowed(entityType);
  const session = await requireSession();
  if (!session.person) return { error: "Profilo persona mancante" };

  // Sanifica patch: rimuove campi tecnici che non devono essere editati
  const FORBIDDEN_FIELDS = [
    "id", "created_at", "created_by", "deleted_at", "deleted_by",
    "delete_reason", "revision_number", "reviewed_by", "reviewed_at",
    "company_id",
  ];
  const cleanPatch: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) {
    if (!FORBIDDEN_FIELDS.includes(k)) cleanPatch[k] = v;
  }

  const admin = createServiceRoleClient();

  // Leggi snapshot precedente
  const { data: oldRow } = await admin.from(entityType).select("*").eq("id", entityId).maybeSingle();
  if (!oldRow) return { error: "Record non trovato" };
  if (oldRow.deleted_at) return { error: "Record già eliminato" };

  // Bumpa revision_number + firma applicativa
  const updates: Record<string, unknown> = {
    ...cleanPatch,
    updated_by: session.person.id,
    updated_at: new Date().toISOString(),
    reviewed_by: session.person.id,
    reviewed_at: new Date().toISOString(),
  };
  if (REVISIONABLE.has(entityType)) {
    updates.revision_number = (oldRow.revision_number ?? 1) + 1;
  }

  const { data: newRow, error } = await admin
    .from(entityType)
    .update(updates)
    .eq("id", entityId)
    .select("*")
    .single();
  if (error || !newRow) return { error: error?.message ?? "Update fallito" };

  // Snapshot revisione
  if (REVISIONABLE.has(entityType)) {
    await createEntityRevision({
      entity_type: entityType,
      entity_id: entityId,
      snapshot: newRow,
      change_reason: reason,
      change_type: reasonType,
    });
  }

  // Audit log
  await logUpdate(entityType, entityId, oldRow, newRow, {
    reason,
    reason_type: reasonType,
    revision_number: REVISIONABLE.has(entityType) ? (updates.revision_number as number) : null,
  });

  for (const u of revalidateUrls) revalidatePath(u);
  return { ok: true };
}

export async function genericDeleteAction(
  entityType: string,
  entityId: string,
  reason: string,
  action: "delete" | "archive",
  revalidateUrls: string[] = [],
) {
  ensureAllowed(entityType);
  const session = await requireSession();
  if (!session.person) return { error: "Profilo persona mancante" };
  if (!reason || reason.trim().length < 3) return { error: "Motivo obbligatorio (min 3 caratteri)" };

  const admin = createServiceRoleClient();

  // Se "delete" su entità protetta, forziamo archive
  const effectiveAction = ARCHIVE_ONLY_IF_USED.has(entityType) && action === "delete" ? "archive" : action;

  const { data: oldRow } = await admin.from(entityType).select("*").eq("id", entityId).maybeSingle();
  if (!oldRow) return { error: "Record non trovato" };
  if (oldRow.deleted_at) return { error: "Record già eliminato/archiviato" };

  const updates: Record<string, unknown> = {
    deleted_by: session.person.id,
    deleted_at: new Date().toISOString(),
    delete_reason: reason,
    active: false,
  };
  if (effectiveAction === "archive" && "status" in oldRow) {
    updates.status = "archiviata"; // best-effort, alcuni enum potrebbero non averla
  }

  const { error } = await admin.from(entityType).update(updates).eq("id", entityId);
  if (error) {
    // Se l'enum 'archiviata' non esiste, riprova senza
    const { error: retryErr } = await admin
      .from(entityType)
      .update({ deleted_by: session.person.id, deleted_at: new Date().toISOString(), delete_reason: reason, active: false })
      .eq("id", entityId);
    if (retryErr) return { error: retryErr.message };
  }

  await writeAuditLog({
    entity_type: entityType,
    entity_id: entityId,
    action: effectiveAction === "archive" ? "archive" : "delete",
    reason,
    old_values: oldRow,
  });

  for (const u of revalidateUrls) revalidatePath(u);
  return { ok: true };
}

/**
 * Wrapper "manuale" usato da pagine che hanno già la propria server action di update:
 * crea audit_log + entity_revision in un colpo solo.
 */
export async function recordChange(opts: {
  entityType: string;
  entityId: string;
  oldRow: Record<string, unknown>;
  newRow: Record<string, unknown>;
  reason?: string;
  reasonType?: string;
  createRevision?: boolean;
}) {
  await logUpdate(opts.entityType, opts.entityId, opts.oldRow, opts.newRow, {
    reason: opts.reason,
    reason_type: opts.reasonType,
  });
  if (opts.createRevision) {
    await createEntityRevision({
      entity_type: opts.entityType,
      entity_id: opts.entityId,
      snapshot: opts.newRow,
      change_reason: opts.reason,
      change_type: opts.reasonType,
    });
  }
}
