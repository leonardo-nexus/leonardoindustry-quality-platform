import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";
import type { AuditSource } from "./audit-log";

export type SignatureAction =
  | "compilazione_checklist" | "firma_ricezione" | "conteggio_pezzi" | "upload_foto"
  | "approvazione_documento" | "modifica_scheda" | "apertura_NC" | "chiusura_NC"
  | "autorizzazione_produzione" | "autorizzazione_consegna" | "deroga" | "chiusura_task"
  | "verifica_manutenzione" | "utilizzo_materiale" | "blocco_operativo" | "sblocco_operativo"
  | "firma_intervento" | "firma_responsabile" | "firma_qualita" | "altro";

export interface SignApplicativeInput {
  entity_type: string;
  entity_id: string;
  action: SignatureAction;
  company_id?: string | null;
  project_id?: string | null;
  source?: AuditSource;
  device_info?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  geolocation_lat?: number | null;
  geolocation_lon?: number | null;
  notes?: string | null;
  audit_log_id?: string | null;
}

/**
 * Firma applicativa personale IMMUTABILE.
 * Tutti i campi user vengono presi dalla sessione corrente: non sono modificabili dal chiamante.
 * Nessuna azione critica può essere anonima.
 */
export async function signApplicative(input: SignApplicativeInput): Promise<{ id: string } | { error: string }> {
  try {
    const session = await requireSession();
    if (!session.person?.id) return { error: "Profilo persona obbligatorio per firmare" };

    const admin = createServiceRoleClient();
    const { data: created, error } = await admin
      .from("applicative_signature")
      .insert({
        // Campi user FORZATI dalla sessione - non dal chiamante
        user_id: session.userId,
        person_id: session.person.id,
        user_email: session.email,
        user_full_name: `${session.person.first_name} ${session.person.last_name}`,
        role_code: session.person.role_code,
        // Contesto firma
        company_id: input.company_id ?? session.person.company_id,
        project_id: input.project_id ?? null,
        entity_type: input.entity_type,
        entity_id: input.entity_id,
        action: input.action,
        device_info: input.device_info ?? null,
        source: input.source ?? "web",
        ip_address: input.ip_address ?? null,
        user_agent: input.user_agent ?? null,
        geolocation_lat: input.geolocation_lat ?? null,
        geolocation_lon: input.geolocation_lon ?? null,
        notes: input.notes ?? null,
        audit_log_id: input.audit_log_id ?? null,
      })
      .select("id")
      .single();
    if (error || !created) return { error: error?.message ?? "Insert firma fallito" };
    return { id: created.id };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

/**
 * Recupera firme per una entità (es. timeline firme su una NC).
 */
export async function getSignatures(entity_type: string, entity_id: string) {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("applicative_signature")
    .select("*")
    .eq("entity_type", entity_type)
    .eq("entity_id", entity_id)
    .order("signed_at", { ascending: false });
  return data ?? [];
}
