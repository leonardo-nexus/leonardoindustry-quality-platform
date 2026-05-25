import Link from "next/link";
import { format } from "date-fns";
import { Truck, ShieldCheck, ShieldAlert, ShieldQuestion, Lock, Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createServerClient } from "@/lib/supabase/server";

const STATUS_VARIANT: Record<string, "green" | "blue" | "yellow" | "orange" | "red"> = {
  qualified_excellent: "green",
  qualified: "blue",
  qualified_with_reserve: "yellow",
  conditional: "yellow",
  suspended: "orange",
  blocked: "red",
  not_qualified: "red",
  expired: "red",
  pending: "yellow",
};

const STATUS_LABEL: Record<string, string> = {
  qualified_excellent: "Qualificato eccellente",
  qualified: "Qualificato",
  qualified_with_reserve: "Qualificato con riserva",
  conditional: "Condizionato",
  suspended: "Sospeso / Da migliorare",
  blocked: "Bloccato",
  not_qualified: "Non qualificato",
  expired: "Scaduto",
  pending: "In attesa",
};

export default async function SuppliersQualificationPage({ searchParams }: { searchParams: Promise<{ source?: string; erp_supplier_id?: string }> }) {
  const sp = await searchParams;
  const supabase = await createServerClient();

  const { data: quals } = await supabase
    .from("supplier_qualification")
    .select("id, supplier_name, legal_name, qualification_status, score, blocked_for_orders, valid_until, country, global_id, erp_supplier_id, is_critical")
    .is("deleted_at", null)
    .order("score", { ascending: true });

  const totale = quals?.length ?? 0;
  const qualificati = (quals ?? []).filter((q: any) => ["qualified_excellent", "qualified"].includes(q.qualification_status)).length;
  const conRiserva = (quals ?? []).filter((q: any) => q.qualification_status === "qualified_with_reserve").length;
  const daVerificare = (quals ?? []).filter((q: any) => ["pending", "conditional"].includes(q.qualification_status)).length;
  const bloccati = (quals ?? []).filter((q: any) => q.blocked_for_orders || ["blocked", "not_qualified", "suspended", "expired"].includes(q.qualification_status)).length;

  const isFromErp = sp.source === "erp";

  return (
    <>
      <PageHeader
        title="Qualifica fornitori · FMT-FOR-01"
        description="Console qualifica completa: 13 sezioni · score 0-100 · blocco ordini se non qualificato"
        actions={
          <div className="flex gap-2">
            {isFromErp && (
              <>
                <Badge variant="outline" className="bg-brand-blue/10 text-brand-cyan border-brand-cyan/40">
                  Aperto da ERP
                </Badge>
                <Button asChild variant="outline" size="sm">
                  <a href={process.env.ERP_RETURN_URL ?? "/"}>← Torna a ERP</a>
                </Button>
              </>
            )}
            <Button asChild><Link href="/suppliers/qualification/new"><Plus className="mr-1 h-3 w-3" /> Aggiungi fornitore</Link></Button>
            <Button asChild variant="outline"><Link href="/suppliers">← Fornitori</Link></Button>
          </div>
        }
      />

      {/* Banner blocco ordini */}
      {bloccati > 0 && (
        <div className="mb-4 rounded-md border-2 border-status-red/40 bg-status-red/10 p-3 alert-critical-pulse">
          <p className="text-sm font-bold text-status-red">
            <Lock className="inline h-4 w-4 mr-1" /> ORDINI BLOCCATI verso {bloccati} fornitori non qualificati
          </p>
          <p className="text-xs text-status-red mt-1">
            L'ERP riceverà blocked_for_orders=true tramite API quality-status. Nessun ordine verrà accettato.
          </p>
        </div>
      )}

      {/* KPI in alto */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Kpi label="Fornitori totali" value={totale} icon={Truck} color="text-leo-muted" />
        <Kpi label="Qualificati" value={qualificati} icon={ShieldCheck} color="text-status-green" />
        <Kpi label="Con riserva" value={conRiserva} icon={ShieldQuestion} color="text-status-yellow" />
        <Kpi label="Da verificare" value={daVerificare} icon={ShieldAlert} color="text-status-orange" />
        <Kpi label="Bloccati" value={bloccati} icon={Lock} color="text-status-red" />
      </div>

      {/* Lista fornitori */}
      <Card className="leo-card">
        <CardHeader>
          <CardTitle className="text-base">Tutti i fornitori (peggior score in alto)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {(quals ?? []).map((q: any) => (
            <Link key={q.id} href={`/suppliers/qualification/${q.id}${isFromErp ? "?source=erp" : ""}`} className="block rounded-md border border-leo-border bg-leo-card/40 px-3 py-2 hover:bg-leo-card hover:border-brand-cyan">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{q.legal_name}</span>
                    {q.is_critical && <Badge variant="red" className="text-[10px]">CRITICO</Badge>}
                    {q.global_id && <span className="font-mono text-[10px] text-leo-muted">global:{q.global_id.slice(0, 8)}</span>}
                    {q.erp_supplier_id && <span className="font-mono text-[10px] text-leo-muted">erp:{q.erp_supplier_id}</span>}
                  </div>
                  <div className="text-xs text-leo-muted">
                    {q.country ?? "—"}
                    {q.valid_until && ` · valida fino al ${format(new Date(q.valid_until), "dd/MM/yyyy")}`}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={STATUS_VARIANT[q.qualification_status] ?? "outline"} className="text-[10px]">
                    {STATUS_LABEL[q.qualification_status] ?? q.qualification_status}
                  </Badge>
                  {q.blocked_for_orders && <Lock className="h-4 w-4 text-status-red" />}
                  <div className="font-mono font-bold text-base">{q.score ?? "—"}<span className="text-[10px] text-leo-muted">/100</span></div>
                </div>
              </div>
            </Link>
          ))}
          {totale === 0 && (
            <p className="text-center text-sm text-leo-muted py-8">Nessuna qualifica fornitore registrata. <Link href="/suppliers/qualification/new" className="underline text-brand-cyan">Crea la prima →</Link></p>
          )}
        </CardContent>
      </Card>

      {/* Regole qualifica */}
      <Card className="leo-card mt-4 border-leo-border/50">
        <CardContent className="p-4 text-xs text-leo-muted">
          <strong className="text-leo-text">Regole qualifica:</strong> soglia minima 60/100 · validità 12 mesi · score &lt;60 = bloccato · qualifica scaduta = bloccato · documenti obbligatori mancanti = bloccato/da verificare · con riserva = ordini con approvazione · non qualificato = ERP rifiuta ordini.
        </CardContent>
      </Card>
    </>
  );
}

function Kpi({ label, value, icon: Icon, color }: { label: string; value: number; icon: any; color: string }) {
  return (
    <Card className="leo-card">
      <CardContent className="p-4 text-center">
        <Icon className={`mx-auto mb-1 h-5 w-5 ${color}`} />
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-xs text-leo-muted">{label}</div>
      </CardContent>
    </Card>
  );
}
