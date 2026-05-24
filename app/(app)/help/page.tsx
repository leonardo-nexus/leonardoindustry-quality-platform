import Link from "next/link";
import { BookOpen, Workflow, Smartphone, Bell, Settings as SettingsIcon, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createServerClient } from "@/lib/supabase/server";
import { getCurrentLocale } from "@/lib/i18n/dictionary";

const CATEGORY_ICON: Record<string, any> = {
  workflow: Workflow,
  operation: BookOpen,
  mobile: Smartphone,
  system: Bell,
  guide: BookOpen,
};

const CATEGORY_LABEL_IT: Record<string, string> = {
  workflow: "Percorsi guidati",
  operation: "Operazioni quotidiane",
  mobile: "Mobile e cantiere",
  system: "Sistema e notifiche",
  guide: "Guide",
};
const CATEGORY_LABEL_ES: Record<string, string> = {
  workflow: "Recorridos guiados",
  operation: "Operaciones diarias",
  mobile: "Móvil y obra",
  system: "Sistema y notificaciones",
  guide: "Guías",
};

export default async function HelpIndexPage() {
  const supabase = await createServerClient();
  const locale = await getCurrentLocale();
  const { data: topics } = await supabase
    .from("help_topic")
    .select("slug, category, title_it, title_es, summary_it, summary_es, icon, order_index")
    .eq("active", true)
    .order("order_index");

  const titleField = locale === "es" ? "title_es" : "title_it";
  const summaryField = locale === "es" ? "summary_es" : "summary_it";
  const categoryLabels = locale === "es" ? CATEGORY_LABEL_ES : CATEGORY_LABEL_IT;

  // raggruppa per categoria
  const grouped: Record<string, any[]> = {};
  for (const t of topics ?? []) {
    const cat = t.category ?? "guide";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(t);
  }

  return (
    <>
      <PageHeader
        title={locale === "es" ? "Guía operativa" : "Guida operativa"}
        description={locale === "es"
          ? "Cómo usar la plataforma: recorridos guiados, esquemas lógicos, vínculos a procedimientos y formatos."
          : "Come usare la piattaforma: percorsi guidati, schemi logici, collegamenti a procedure e format."}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {Object.entries(grouped).map(([cat, items]) => {
          const Icon = CATEGORY_ICON[cat] ?? BookOpen;
          return (
            <Card key={cat} className="leo-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Icon className="h-4 w-4 text-brand-cyan" /> {categoryLabels[cat] ?? cat}
                  <Badge variant="outline" className="ml-auto text-[10px]">{items.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {items.map((t: any) => (
                  <Link key={t.slug} href={`/help/${t.slug}`} className="flex items-start justify-between gap-2 rounded-md border border-leo-border bg-leo-card/30 px-3 py-2 text-sm hover:bg-leo-card hover:border-brand-cyan">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{t[titleField]}</div>
                      {t[summaryField] && <p className="mt-0.5 text-xs text-leo-muted">{t[summaryField]}</p>}
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-leo-muted" />
                  </Link>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}
