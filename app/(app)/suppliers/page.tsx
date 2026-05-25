import Link from "next/link";
import { format } from "date-fns";
import { AlertOctagon, ClipboardCheck, Plus, ShieldCheck, Truck, TrendingDown, type LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createServerClient } from "@/lib/supabase/server";

const LEVEL_VARIANT: Record<string, "green" | "blue" | "yellow" | "orange" | "red"> = {
  eccellente: "green",
  affidabile: "blue",
  attenzione: "yellow",
  critico: "orange",
  inaffidabile: "red",
};

type SupplierScoreRow = {
  id: string;
  supplier_name: string;
  score: number;
  level: string;
  unauthorized_production_count: number;
  unauthorized_delivery_count: number;
  forced_delivery_count: number;
  damage_count: number;
  nc_open_count: number;
  total_estimated_loss: number;
  last_event_at: string | null;
  company?: { name: string | null } | null;
};

type QualificationRow = {
  id: string;
  legal_name: string;
  supplier_name: string;
  qualification_status: string | null;
  score: number | null;
  blocked_for_orders: boolean | null;
  valid_until: string | null;
  country: string | null;
};

export default async function SuppliersPage() {
  const supabase = await createServerClient();
  const { data: scores } = await supabase
    .from("supplier_score")
    .select("*, company:company_id(name)")
    .order("score", { ascending: true });
  const { data: qualifications } = await supabase
    .from("supplier_qualification")
    .select("id, legal_name, supplier_name, qualification_status, score, blocked_for_orders, valid_until, country")
    .is("deleted_at", null)
    .order("score", { ascending: true });

  const scoreRows = (scores ?? []) as SupplierScoreRow[];
  const qualificationRows = (qualifications ?? []) as QualificationRow[];
  const totalLoss = scoreRows.reduce((sum, score) => sum + (Number(score.total_estimated_loss) || 0), 0);
  const critici = scoreRows.filter((score) => ["critico", "inaffidabile"].includes(score.level)).length;
  const qualificati = qualificationRows.filter((qualification) => ["qualified_excellent", "qualified"].includes(qualification.qualification_status ?? "")).length;
  const bloccati = qualificationRows.filter((qualification) => qualification.blocked_for_orders).length;

  return (
    <>
      <PageHeader
        title="Fornitori"
        description="Punteggio fornitore + qualifica + penalita + danni stimati. Eventi auto-aggiornati da gate e NC."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/suppliers/qualification/new">
                <Plus className="h-4 w-4" />
                Aggiungi fornitore
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/suppliers/qualification">
                <ClipboardCheck className="h-4 w-4" />
                Cruscotto qualifiche
              </Link>
            </Button>
          </div>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <KpiCard
          icon={TrendingDown}
          value={totalLoss.toLocaleString("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}
          label="Danno totale stimato"
          color="text-status-red"
          border="border-status-red/40"
        />
        <KpiCard icon={AlertOctagon} value={critici} label="Fornitori critici" color="text-status-orange" border="border-status-orange/40" />
        <KpiCard icon={Truck} value={scoreRows.length} label="Fornitori tracciati" color="text-brand-cyan" />
        <KpiCard icon={ShieldCheck} value={qualificati} label="Qualificati" color="text-status-green" border="border-status-green/40" />
        <KpiCard icon={AlertOctagon} value={bloccati} label="Bloccati ordini" color="text-status-red" border="border-status-red/40" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <Card className="leo-card">
          <CardHeader>
            <CardTitle className="text-base">Qualifiche fornitore</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {qualificationRows.map((qualification) => (
              <Link
                key={qualification.id}
                href={`/suppliers/qualification/${qualification.id}`}
                className="flex items-center justify-between rounded-md border border-leo-border bg-leo-card/40 px-3 py-2 text-sm hover:border-brand-cyan hover:bg-leo-card"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{qualification.legal_name}</div>
                  <div className="text-xs text-leo-muted">
                    {qualification.country ?? "-"}
                    {qualification.valid_until && <> - valida fino al {format(new Date(qualification.valid_until), "dd/MM/yyyy")}</>}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant={qualification.blocked_for_orders ? "red" : ["qualified_excellent", "qualified"].includes(qualification.qualification_status ?? "") ? "green" : "yellow"}>
                    {qualification.blocked_for_orders ? "bloccato" : qualification.qualification_status?.replace(/_/g, " ") ?? "in attesa"}
                  </Badge>
                  <div className="font-mono text-lg font-bold">{qualification.score ?? 0}<span className="text-xs text-leo-muted">/100</span></div>
                </div>
              </Link>
            ))}
            {qualificationRows.length === 0 && (
              <p className="py-8 text-center text-sm text-leo-muted">
                Nessuna qualifica registrata. <Link href="/suppliers/qualification/new" className="text-brand-cyan underline">Crea la prima</Link>
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="leo-card">
          <CardHeader>
            <CardTitle className="text-base">Punteggio fornitori (peggiori in alto)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {scoreRows.map((score) => (
              <Link
                key={score.id}
                href={`/suppliers/${encodeURIComponent(score.supplier_name)}`}
                className="flex items-center justify-between rounded-md border border-leo-border bg-leo-card/40 px-3 py-2 text-sm hover:border-brand-cyan hover:bg-leo-card"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{score.supplier_name}</div>
                  <div className="text-xs text-leo-muted">
                    {score.company?.name ?? "-"}
                    - {score.unauthorized_production_count}+{score.unauthorized_delivery_count}+{score.forced_delivery_count} forzature
                    - {score.damage_count} danni - {score.nc_open_count} NC aperte
                    {score.total_estimated_loss > 0 && <> - perdita {Number(score.total_estimated_loss).toLocaleString("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}</>}
                    {score.last_event_at && <> - ultimo evento {format(new Date(score.last_event_at), "dd/MM/yyyy")}</>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={LEVEL_VARIANT[score.level] ?? "outline"}>{score.level}</Badge>
                  <div className="font-mono text-lg font-bold">{score.score}<span className="text-xs text-leo-muted">/100</span></div>
                </div>
              </Link>
            ))}
            {scoreRows.length === 0 && (
              <p className="py-8 text-center text-sm text-leo-muted">Nessun fornitore tracciato ancora</p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function KpiCard({
  icon: Icon,
  value,
  label,
  color,
  border = "border-leo-border",
}: {
  icon: LucideIcon;
  value: string | number;
  label: string;
  color: string;
  border?: string;
}) {
  return (
    <Card className={`leo-card ${border}`}>
      <CardContent className="p-4 text-center">
        <Icon className={`mx-auto mb-1 h-5 w-5 ${color}`} />
        <div className={`text-2xl font-bold ${color}`}>{value}</div>
        <div className="text-xs text-leo-muted">{label}</div>
      </CardContent>
    </Card>
  );
}
