import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";

export type AuditAction =
  | "create" | "update" | "delete" | "restore" | "approve" | "reject"
  | "archive" | "revise" | "complete" | "block" | "unblock" | "sign"
  | "upload" | "download" | "import" | "export" | "escalate" | "dismiss" | "snooze"
  | "assign";

export type AuditSource = "web" | "mobile" | "tablet" | "palmare" | "system" | "import" | "cron";

export interface AuditLogPayload {
  entity_type: string;
  entity_id: string;
  action: AuditAction;
  company_id?: string | null;
  old_values?: Record<string, unknown> | null;
  new_values?: Record<string, unknown> | null;
  changed_fields?: string[] | null;
  reason?: string | null;
  reason_type?: string | null;
  revision_number?: number | null;
  source?: AuditSource;
  ip_address?: string | null;
  user_agent?: string | null;
}

/**
 * Calcola i campi effettivamente modificati confrontando old e new.
 */
export function diffFields(
  oldRow: Record<string, unknown> | null | undefined,
  newRow: Record<string, unknown> | null | undefined,
): { changed_fields: string[]; old_values: Record<string, unknown>; new_values: Record<string, unknown> } {
  const changed_fields: string[] = [];
  const old_values: Record<string, unknown> = {};
  const new_values: Record<string, unknown> = {};
  const keys = new Set([
    ...Object.keys(oldRow ?? {}),
    ...Object.keys(newRow ?? {}),
  ]);
  for (const k of keys) {
    // skip campi tecnici/firma
    if ([
      "updated_at", "created_at", "deleted_at", "reviewed_at", "approved_at",
      "updated_by", "created_by", "deleted_by", "reviewed_by", "approved_by",
    ].includes(k)) continue;
    const a = (oldRow ?? {})[k];
    const b = (newRow ?? {})[k];
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      changed_fields.push(k);
      old_values[k] = a;
      new_values[k] = b;
    }
  }
  return { changed_fields, old_values, new_values };
}

/**
 * Inserisce un record in audit_log con firma automatica dell'utente loggato.
 * Non modifica il record originale. Errori di audit non interrompono il flusso (best-effort).
 */
export async function writeAuditLog(payload: AuditLogPayload): Promise<void> {
  try {
    const session = await requireSession();
    const admin = createServiceRoleClient();
    await admin.from("audit_log").insert({
      entity_type: payload.entity_type,
      entity_id: payload.entity_id,
      action: payload.action,
      company_id: payload.company_id ?? session.person?.company_id ?? null,
      old_values: payload.old_values ?? null,
      new_values: payload.new_values ?? null,
      changed_fields: payload.changed_fields ?? null,
      reason: payload.reason ?? null,
      reason_type: payload.reason_type ?? null,
      revision_number: payload.revision_number ?? null,
      user_id: session.userId,
      person_id: session.person?.id ?? null,
      user_email: session.email,
      user_full_name: session.person ? `${session.person.first_name} ${session.person.last_name}` : null,
      source: payload.source ?? "web",
      ip_address: payload.ip_address ?? null,
      user_agent: payload.user_agent ?? null,
    });
  } catch (err) {
    console.warn("[audit] write failed:", (err as Error).message);
  }
}

export async function logCreate(entity_type: string, entity_id: string, new_values: Record<string, unknown>, extra?: Partial<AuditLogPayload>) {
  return writeAuditLog({ entity_type, entity_id, action: "create", new_values, ...extra });
}

export async function logUpdate(
  entity_type: string,
  entity_id: string,
  oldRow: Record<string, unknown> | null | undefined,
  newRow: Record<string, unknown> | null | undefined,
  extra?: Partial<AuditLogPayload>,
) {
  const { changed_fields, old_values, new_values } = diffFields(oldRow, newRow);
  if (changed_fields.length === 0) return;
  return writeAuditLog({
    entity_type,
    entity_id,
    action: "update",
    old_values,
    new_values,
    changed_fields,
    ...extra,
  });
}

export async function logDelete(entity_type: string, entity_id: string, reason: string, extra?: Partial<AuditLogPayload>) {
  return writeAuditLog({ entity_type, entity_id, action: "delete", reason, ...extra });
}

export async function logApprove(entity_type: string, entity_id: string, extra?: Partial<AuditLogPayload>) {
  return writeAuditLog({ entity_type, entity_id, action: "approve", ...extra });
}

export async function logRevision(entity_type: string, entity_id: string, revision_number: number, extra?: Partial<AuditLogPayload>) {
  return writeAuditLog({ entity_type, entity_id, action: "revise", revision_number, ...extra });
}

export async function logBlock(entity_type: string, entity_id: string, reason: string, extra?: Partial<AuditLogPayload>) {
  return writeAuditLog({ entity_type, entity_id, action: "block", reason, ...extra });
}

export interface EntityHistoryRow {
  id: string;
  action: AuditAction;
  changed_fields: string[] | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  reason: string | null;
  reason_type: string | null;
  user_full_name: string | null;
  user_email: string | null;
  source: AuditSource;
  revision_number: number | null;
  created_at: string;
}

export async function getEntityHistory(entity_type: string, entity_id: string, limit = 50): Promise<EntityHistoryRow[]> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("audit_log")
    .select("id, action, changed_fields, old_values, new_values, reason, reason_type, user_full_name, user_email, source, revision_number, created_at")
    .eq("entity_type", entity_type)
    .eq("entity_id", entity_id)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as EntityHistoryRow[];
}
