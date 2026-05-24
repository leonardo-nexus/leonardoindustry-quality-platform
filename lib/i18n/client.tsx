"use client";
import { createContext, useContext } from "react";
import it from "@/messages/it.json";
import { lookup } from "./dictionary";
import type { Locale } from "./config";

type Dict = typeof it;

const I18nContext = createContext<{ dict: Dict; locale: Locale }>({ dict: it, locale: "it" });

export function I18nProvider({ children, dict, locale }: { children: React.ReactNode; dict: Dict; locale: Locale }) {
  return <I18nContext.Provider value={{ dict, locale }}>{children}</I18nContext.Provider>;
}

export function useT() {
  const { dict, locale } = useContext(I18nContext);
  const t = (key: string, vars?: Record<string, string | number>) => lookup(dict, key, vars);
  return { t, locale };
}
