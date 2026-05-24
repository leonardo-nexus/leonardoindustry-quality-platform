import "server-only";
import { cookies } from "next/headers";
import it from "@/messages/it.json";
import es from "@/messages/es.json";
import { createServerClient } from "@/lib/supabase/server";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from "./config";

const DICTS: Record<Locale, typeof it> = { it, es: es as typeof it };

/** Risolve la locale corrente:
 *  1) cookie utente
 *  2) person.locale del DB (se loggato)
 *  3) Accept-Language header (best-effort)
 *  4) default it
 */
export async function getCurrentLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(LOCALE_COOKIE)?.value;
  if (isLocale(cookieValue)) return cookieValue;

  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: person } = await supabase
        .from("person")
        .select("locale")
        .eq("auth_user_id", user.id)
        .maybeSingle();
      if (person?.locale && isLocale(person.locale)) return person.locale;
    }
  } catch {}

  return DEFAULT_LOCALE;
}

export async function getDictionary(): Promise<typeof it> {
  const locale = await getCurrentLocale();
  return DICTS[locale];
}

/** Lookup chiave "nav.dashboard" → string. Interpola {placeholder} se vars passati. */
export function lookup(dict: typeof it, path: string, vars?: Record<string, string | number>): string {
  const parts = path.split(".");
  let cur: any = dict;
  for (const p of parts) {
    cur = cur?.[p];
    if (cur == null) return path; // chiave mancante: ritorna chiave per debug visivo
  }
  if (typeof cur !== "string") return path;
  if (vars) {
    return Object.keys(vars).reduce((acc, k) => acc.replaceAll(`{${k}}`, String(vars[k])), cur);
  }
  return cur;
}

/** Server-side helper: getT() restituisce funzione t(key, vars?) con dizionario corrente caricato. */
export async function getT() {
  const dict = await getDictionary();
  return (key: string, vars?: Record<string, string | number>) => lookup(dict, key, vars);
}

/** Helper sincrono per testi su template bilingue: ritorna title_<locale> con fallback it -> es -> base */
export async function localizedField<T extends Record<string, any>>(row: T | null, base: string): Promise<string> {
  if (!row) return "";
  const locale = await getCurrentLocale();
  return row[`${base}_${locale}`] ?? row[`${base}_it`] ?? row[base] ?? "";
}

export function pickLocalizedField<T extends Record<string, any>>(row: T | null, base: string, locale: Locale): string {
  if (!row) return "";
  return row[`${base}_${locale}`] ?? row[`${base}_it`] ?? row[base] ?? "";
}

export { DICTS };
