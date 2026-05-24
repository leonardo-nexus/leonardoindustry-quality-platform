import Link from "next/link";
import { ClipboardList, AlertTriangle, ListChecks, Lock } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createServerClient } from "@/lib/supabase/server";

const CATEGORY_LABEL: Record<string, string> = {
  documentazione: "Documentazione",
  rischi: "Rischi e opportunità",
  clienti: "Clienti e contratti",
  fornitori: "Fornitori e subappalti",
  hr: "Risorse umane",
  commesse: "Commesse",
  asset: "Asset e strumenti",
  audit: "Audit",
  nc: "Non conformità",
  ambiente: "Ambiente",
  sicurezza: "Sicurezza",
  incidenti: "Incidenti",
  saldatura: "Saldatura UNE-EN 1090",
  altro: "Altro",
};

const CATEGORY_TONE: Record<string, string> = {
  documentazione: "border-blue-500/40 bg-blue-500/5",
  rischi: "border-orange-500/40 bg-orange-500/5",
  clienti: "border-cyan-500/40 bg-cyan-500/5",
  fornitori: "border-purple-500/40 bg-purple-500/5",
  hr: "border-emerald-500/40 bg-emerald-500/5",
  commesse: "border-amber-500/40 bg-amber-500/5",
  asset: "border-slate-500/40 bg-slate-500/5",
  audit: "border-indigo-500/40 bg-indigo-500/5",
  nc: "border-red-500/40 bg-red-500/5",
  ambiente: "border-green-500/40 bg-green-500/5",
  sicurezza: "border-yellow-500/40 bg-yellow-500/5",
  incidenti: "border-red-500/40 bg-red-500/5",
  saldatura: "border-orange-500/40 bg-orange-500/5",
  altro: "border-leo-border bg-leo-card/40",
};

export default async function FormsCatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createServerClient();
  let query = supabase
    .from("form_template")
    .select("id, code, title, category, genera_task, genera_nc, blocco_operativo, frequenza, process:process_id(name)")
    .eq("active", true)
    .order("code");
  if (params.category) query = query.eq("category", params.category);
  const { data: templates } = await query;

  type FormRow = NonNullable<typeof templates>[number];
  const byCategory = (templates ?? []).reduce<Record<string, FormRow[]>>((acc, t: any) => {
    (acc[t.category] = acc[t.category] || []).push(t);
    return acc;
  }, {});

  return (
    <>
      <PageHeader
        title="Format compilabili"
        description={`Catalogo dei ${templates?.length ?? 0} format digitali · ogni compilazione può generare task, NC o blocchi operativi`}
        actions={
          <Button asChild variant="outline">
            <Link href="/forms/submissions">Le mie compilazioni</Link>
          </Button>
        }
      />

      {/* Filtro categoria */}
      <div className="mb-6 flex flex-wrap gap-2 text-sm">
        <Link
          href="/forms"
          className={`rounded-md border px-3 py-1.5 transition-colors ${
            !params.category ? "bg-brand-cyan/20 border-brand-cyan text-brand-cyan" : "border-leo-border text-leo-muted hover:bg-leo-card"
          }`}
        >
          Tutti
        </Link>
        {Object.entries(CATEGORY_LABEL).map(([key, label]) => (
          <Link
            key={key}
            href={`/forms?category=${key}`}
            className={`rounded-md border px-3 py-1.5 transition-colors ${
              params.category === key ? "bg-brand-cyan/20 border-brand-cyan text-brand-cyan" : "border-leo-border text-leo-muted hover:bg-leo-card"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      <div className="space-y-8">
        {Object.entries(byCategory).map(([cat, items]) => (
          <section key={cat}>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-leo-muted">
              {CATEGORY_LABEL[cat] ?? cat} · {items.length}
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((t: any) => (
                <Link key={t.id} href={`/forms/${t.code}`} className="block">
                  <Card className={`${CATEGORY_TONE[cat] ?? ""} transition-all hover:scale-[1.02] hover:shadow-xl`}>
                    <CardContent className="p-4">
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <div className="font-mono text-xs text-brand-cyan">{t.code}</div>
                        <div className="flex gap-1">
                          {t.genera_task && <span title="Genera task automatico"><ListChecks className="h-3.5 w-3.5 text-status-blue" /></span>}
                          {t.genera_nc && <span title="Può generare NC"><AlertTriangle className="h-3.5 w-3.5 text-status-orange" /></span>}
                          {t.blocco_operativo && <span title="Blocco operativo"><Lock className="h-3.5 w-3.5 text-status-red" /></span>}
                        </div>
                      </div>
                      <div className="text-sm font-medium text-leo-text">{t.title}</div>
                      {t.process?.name && (
                        <div className="mt-2 text-xs text-leo-muted">{t.process.name}</div>
                      )}
                      <div className="mt-3 flex items-center justify-between">
                        <Badge variant="outline" className="text-xs">{t.frequenza}</Badge>
                        <ClipboardList className="h-4 w-4 text-leo-muted" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        ))}
        {(templates?.length ?? 0) === 0 && (
          <p className="text-center text-leo-muted">Nessun format con questo filtro.</p>
        )}
      </div>
    </>
  );
}
