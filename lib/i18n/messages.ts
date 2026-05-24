import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";
import type { Locale } from "./config";

/** Renderizza il template con vars {placeholder}. */
export function renderTemplate(text: string | null | undefined, vars?: Record<string, string | number | null | undefined>): string {
  if (!text) return "";
  if (!vars) return text;
  return Object.keys(vars).reduce((acc, k) => acc.replaceAll(`{${k}}`, vars[k] == null ? "" : String(vars[k])), text);
}

/**
 * Recupera message_template per key e ritorna title/body nella locale richiesta.
 * Fallback: locale richiesta → it → es → text/body originale.
 */
export async function getMessage(key: string, locale: Locale, vars?: Record<string, string | number | null | undefined>) {
  const admin = createServiceRoleClient();
  const { data: tpl } = await admin
    .from("message_template")
    .select("title_it, title_es, body_it, body_es, subject, body")
    .eq("code", key)
    .maybeSingle();
  if (!tpl) return { title: key, body: "" };

  const titleField = locale === "es" ? "title_es" : "title_it";
  const bodyField  = locale === "es" ? "body_es"  : "body_it";

  const title = (tpl as any)[titleField] ?? (tpl as any).title_it ?? (tpl as any).title_es ?? (tpl as any).subject ?? key;
  const body  = (tpl as any)[bodyField]  ?? (tpl as any).body_it  ?? (tpl as any).body_es  ?? (tpl as any).body  ?? "";

  return { title: renderTemplate(title, vars), body: renderTemplate(body, vars) };
}

/**
 * Risolve la locale preferita di una persona destinataria di notifica.
 * Fallback: it.
 */
export async function getRecipientLocale(personId: string): Promise<Locale> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("person")
    .select("locale")
    .eq("id", personId)
    .maybeSingle();
  const v = (data as any)?.locale;
  if (v === "it" || v === "es") return v;
  return "it";
}

export interface BilingualNotificationInput {
  company_id: string;
  project_id?: string | null;
  source_type: string;
  source_id?: string | null;
  severity: "info" | "alert" | "critical";
  template_key?: string;
  recipient_person_id?: string | null;
  title_it?: string;
  title_es?: string;
  message_it?: string;
  message_es?: string;
  vars?: Record<string, string | number | null | undefined>;
  action_url?: string;
}

/**
 * Crea una notification rendendola nella locale del destinatario.
 * Se template_key è fornito, usa message_template per il rendering.
 * Altrimenti usa i title_it/es e message_it/es passati inline.
 */
export async function createLocalizedNotification(input: BilingualNotificationInput) {
  const admin = createServiceRoleClient();

  // Determina locale destinatario
  let locale: Locale = "it";
  if (input.recipient_person_id) {
    locale = await getRecipientLocale(input.recipient_person_id);
  }

  let title = "";
  let message = "";

  if (input.template_key) {
    const m = await getMessage(input.template_key, locale, input.vars);
    title = m.title;
    message = m.body;
  } else {
    const titleField = locale === "es" ? "title_es" : "title_it";
    const msgField = locale === "es" ? "message_es" : "message_it";
    title = renderTemplate((input as any)[titleField] ?? (input as any).title_it ?? "", input.vars);
    message = renderTemplate((input as any)[msgField] ?? (input as any).message_it ?? "", input.vars);
  }

  await admin.from("notification").insert({
    company_id: input.company_id,
    project_id: input.project_id ?? null,
    source_type: input.source_type,
    source_id: input.source_id ?? null,
    severity: input.severity,
    title,
    message,
    action_url: input.action_url ?? null,
    locale,
    template_key: input.template_key ?? null,
  });
}
