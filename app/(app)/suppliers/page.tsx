import Link from "next/link";
import { format } from "date-fns";
import { Truck, TrendingDown, AlertOctagon } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createServerClient } from "@/lib/supabase/server";

const LEVEL_VARIANT: Record<string, "green" | "blue" | "yellow" | "orange" | "red"> = {
  eccellente: "green", affidabile: "blue", attenzione: "yellow", critico: "orange", inaffidabile: "red",
};

export default async function SuppliersPage() {
  const supabase = await createServerClient();
  const { data: scores } = await supabase
    .from("supplier_score")
    .select("*, company:company_id(name)")
    .order("score", { ascending: true });

  const totalLoss = (scores ?? []).reduce((s, x: any) => s + (Number(x.total_estimated_loss) ?? 0), 0);
  const critici = (scores ?? []).filter((s: any) => ["critico", "inaffidabile"].includes(s.level)).length;

  return (
    <>
      <PageHeader
        title="Fornitori"
        description="Punteggio fornitore + penalità + danni stimati. Eventi auto-aggiornati da gate e NC."
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="leo-card border-status-red/40">
          <CardContent className="p-4 text-center">
            <TrendingDown className="mx-auto mb-1 h-5 w-5 text-status-red" />
            <div className="text-2xl font-bold text-status-red">{totalLoss.toLocaleString("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}</div>
            <div className="text-xs text-leo-muted">Danno totale stimato</div>
          </CardContent>
        </Card>
        <Card className="leo-card border-status-orange/40">
          <CardContent className="p-4 text-center">
            <AlertOctagon className="mx-auto mb-1 h-5 w-5 text-status-orange" />
            <div className="text-2xl font-bold">{critici}</div>
            <div className="text-xs text-leo-muted">Fornitori critici/inaffidabili</div>
          </CardContent>
        </Card>
        <Card className="leo-card">
          <CardContent className="p-4 text-center">
            <Truck className="mx-auto mb-1 h-5 w-5 text-brand-cyan" />
            <div className="text-2xl font-bold">{scores?.length ?? 0}</div>
            <div className="text-xs text-leo-muted">Fornitori tracciati</div>
          </CardContent>
        </Card>
      </div>

      <Card className="leo-card">
        <CardHeader>
          <CardTitle className="text-base">Punteggio fornitori (peggiori in alto)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {(scores ?? []).map((s: any) => (
            <div key={s.id} className="flex items-center justify-between rounded-md border border-leo-border bg-leo-card/40 px-3 py-2 text-sm">
              <div className="flex-1 min-w-0">
                <div className="font-medium">{s.supplier_name}</div>
                <div className="text-xs text-leo-muted">
                  {s.company?.name ?? "—"}
                  · {s.unauthorized_production_count}+{s.unauthorized_delivery_count}+{s.forced_delivery_count} forzature
                  · {s.damage_count} danni · {s.nc_open_count} NC aperte
                  {s.total_estimated_loss > 0 && <> · perdita {Number(s.total_estimated_loss).toLocaleString("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}</>}
                  {s.last_event_at && <> · ultimo evento {format(new Date(s.last_event_at), "dd/MM/yyyy")}</>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={LEVEL_VARIANT[s.level] ?? "outline"}>{s.level}</Badge>
                <div className="font-mono font-bold text-lg">{s.score}<span className="text-xs text-leo-muted">/100</span></div>
              </div>
            </div>
          ))}
          {(scores?.length ?? 0) === 0 && (
            <p className="text-center text-sm text-leo-muted py-8">Nessun fornitore tracciato ancora</p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
