import type it from "@/messages/it.json";

type Dict = typeof it;

/** Lookup chiave "nav.dashboard" → string. Interpola {placeholder} se vars passati.
 *  File condiviso client+server (niente server-only / next/headers). */
export function lookup(dict: Dict, path: string, vars?: Record<string, string | number>): string {
  const parts = path.split(".");
  let cur: any = dict;
  for (const p of parts) {
    cur = cur?.[p];
    if (cur == null) return path;
  }
  if (typeof cur !== "string") return path;
  if (vars) {
    return Object.keys(vars).reduce((acc, k) => acc.replaceAll(`{${k}}`, String(vars[k])), cur);
  }
  return cur;
}
