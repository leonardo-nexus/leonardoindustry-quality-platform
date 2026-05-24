export const SUPPORTED_LOCALES = ["it", "es"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "it";

export const LOCALE_COOKIE = "leo-locale";

export function isLocale(x: string | null | undefined): x is Locale {
  return !!x && (SUPPORTED_LOCALES as readonly string[]).includes(x);
}

export const LOCALE_LABEL: Record<Locale, string> = {
  it: "Italiano",
  es: "Español",
};
