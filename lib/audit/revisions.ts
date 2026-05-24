import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";
import { logRevision } from "./audit-log";

export interface EntityRevisionRow {
  id: string;
  entity_type: string;
  entity_id: string;
  revision_number: number;
  snapshot: Record<string, unknown>;
  changed_by: string | null;
  changed_at: string;
  change_reason: string | null;
  change_type: string | null;
  is_current: boolean;
  approved_by: string | null;
  approved_at: string | null;
  status: "attiva" | "obsoleta" | "in_approvazione" | "revocata";
}

/**
 * Crea una nuova revisione snapshot per un oggetto critico.
 * - Marca la precedente "obsoleta" (is_current=false)
 * - La nuova diventa is_current=true
 * - Bumpa revision_number sulla tabella sorgente se la colonna esiste
 */
export async function createEntityRevision(opts: {
  entity_type: string;
  entity_id: string;
  snapshot: Record<string, unknown>;
  change_reason?: string;
  change_type?: string;
  company_id?: string | null;
}): Promise<{ revision_number: number; id: string } | { error: string }> {
  const session = await requireSession();
  const admin = createServiceRoleClient();

  // Trova ultima revisione
  const { data: last } = await admin
    .from("entity_revision")
    .select("revision_number")
    .eq("entity_type", opts.entity_type)
    .eq("entity_id", opts.entity_id)
    .order("revision_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextRev = (last?.revision_number ?? 0) + 1;

  // Obsoleta precedenti
  await admin
    .from("entity_revision")
    .update({ is_current: false, status: "obsoleta" })
    .eq("entity_type", opts.entity_type)
    .eq("entity_id", opts.entity_id)
    .eq("is_current", true);

  // Inserisci nuova
  const { data: created, error: insErr } = await admin
    .from("entity_revision")
    .insert({
      entity_type: opts.entity_type,
      entity_id: opts.entity_id,
      revision_number: nextRev,
      snapshot: opts.snapshot,
      changed_by: session.person?.id ?? null,
      change_reason: opts.change_reason ?? null,
      change_type: opts.change_type ?? null,
      is_current: true,
      status: "attiva",
      company_id: opts.company_id ?? session.person?.company_id ?? null,
    })
    .select("id")
    .single();
  if (insErr || !created) return { error: insErr?.message ?? "Insert revision fallito" };

  // Audit log
  await logRevision(opts.entity_type, opts.entity_id, nextRev, {
    reason: opts.change_reason,
    reason_type: opts.change_type,
    company_id: opts.company_id,
  });

  return { revision_number: nextRev, id: created.id };
}

export async function getCurrentRevision(entity_type: string, entity_id: string): Promise<EntityRevisionRow | null> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("entity_revision")
    .select("*")
    .eq("entity_type", entity_type)
    .eq("entity_id", entity_id)
    .eq("is_current", true)
    .maybeSingle();
  return (data as EntityRevisionRow | null) ?? null;
}

export async function getRevisionHistory(entity_type: string, entity_id: string): Promise<EntityRevisionRow[]> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("entity_revision")
    .select("*")
    .eq("entity_type", entity_type)
    .eq("entity_id", entity_id)
    .order("revision_number", { ascending: false });
  return (data ?? []) as EntityRevisionRow[];
}

export interface RevisionDiff {
  field: string;
  before: unknown;
  after: unknown;
}

export function compareRevisions(a: EntityRevisionRow, b: EntityRevisionRow): RevisionDiff[] {
  const out: RevisionDiff[] = [];
  const keys = new Set([...Object.keys(a.snapshot), ...Object.keys(b.snapshot)]);
  for (const k of keys) {
    const av = (a.snapshot as Record<string, unknown>)[k];
    const bv = (b.snapshot as Record<string, unknown>)[k];
    if (JSON.stringify(av) !== JSON.stringify(bv)) {
      out.push({ field: k, before: av, after: bv });
    }
  }
  return out;
}
