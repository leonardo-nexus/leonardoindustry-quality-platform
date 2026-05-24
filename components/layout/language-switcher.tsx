"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setLocaleAction } from "@/app/actions/set-locale";
import { useT } from "@/lib/i18n/client";

export function LanguageSwitcher() {
  const router = useRouter();
  const { locale } = useT();
  const [pending, startTransition] = useTransition();

  function change(next: "it" | "es") {
    if (next === locale) return;
    startTransition(async () => {
      await setLocaleAction(next);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-1 rounded-md border border-leo-border bg-leo-card/60 px-1">
      <Languages className="h-3 w-3 text-leo-muted mr-1" aria-hidden />
      <Button
        size="sm"
        variant={locale === "it" ? "default" : "ghost"}
        className="h-6 px-2 text-xs"
        disabled={pending}
        onClick={() => change("it")}
        aria-label="Italiano"
      >IT</Button>
      <Button
        size="sm"
        variant={locale === "es" ? "default" : "ghost"}
        className="h-6 px-2 text-xs"
        disabled={pending}
        onClick={() => change("es")}
        aria-label="Español"
      >ES</Button>
    </div>
  );
}
