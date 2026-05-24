import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { Wrench, Plus, TrendingDown } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createServerClient } from "@/lib/supabase/server";

const CATEGORY_VARIANT: Record<string, "yellow" | "orange" | "red" | "blue"> = {
  ordinario: "blue", straordinario: "yellow", urgente: "orange", garanzia: "red",
};

export default async function AssetInterventionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerClient();

  const { data: asset } = await supabase
    .from("asset")
    .select("id, code, name, status, company:company_id(name)")
    .eq("id", id)
    .maybeSingle();
  if (!asset) notFound();

  const { data: interventions } = await supabase
    .from("asset_intervention")
    .select("*, performer:performed_by(first_name, last_name)")
    .eq("asset_id", id)
    .is("deleted_at", null)
    .order("completed_at", { ascending: false });

  const totalCost = (interventions ?? []).reduce((s: number, i: any) => s + Number(i.total_cost ?? 0), 0);
  const lastYearCost = (interventions ?? [])
    .filter((i: any) => i.completed_at && new Date(i.completed_at) > new Date(Date.now() - 365 * 86400_000))
    .reduce((s: number, i: any) => s + Number(i.total_cost ?? 0), 0);
  const nextDue = (interventions ?? []).find((i: any) => i.next_due_date && new Date(i.next_due_date) > new Date());

  return (
    <>
      <PageHeader
        title={`Interventi · ${asset.code}`}
        description={`${asset.name} · ${(asset as any).company?.name ?? "—"}`}
        actions={
          <div className="flex gap-2">
            <Button asChild><Link href={`/assets/${id}/interventions/new`}><Plus className="mr-1 h-3 w-3" /> Nuovo intervento</Link></Button>
            <Button asChild variant="outline"><Link href={`/assets/${id}`}>← Asset</Link></Button>
          </div>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="leo-card">
          <CardContent className="p-4 text-center">
            <Wrench className="mx-auto mb-1 h-5 w-5 text-brand-cyan" />
            <div className="text-2xl font-bold">{interventions?.length ?? 0}</div>
            <div className="text-xs text-leo-muted">Interventi totali</div>
          </CardContent>
        </Card>
        <Card className="leo-card">
          <CardContent className="p-4 text-center">
            <TrendingDown className="mx-auto mb-1 h-5 w-5 text-status-orange" />
            <div className="text-2xl font-bold">{totalCost.toLocaleString("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}</div>
            <div className="text-xs text-leo-muted">Costo totale</div>
          </CardContent>
        </Card>
        <Card className="leo-card">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{lastYearCost.toLocaleString("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}</div>
            <div className="text-xs text-leo-muted">Ultimo anno</div>
          </CardContent>
        </Card>
        <Card className="leo-card">
          <CardContent className="p-4 text-center">
            <div className="text-sm font-bold">{nextDue?.next_due_date ? format(new Date(nextDue.next_due_date), "dd/MM/yyyy") : "—"}</div>
            <div className="text-xs text-leo-muted">Prossima scadenza</div>
          </CardContent>
        </Card>
      </div>

      <Card className="leo-card">
        <CardContent className="p-0">
          <div className="divide-y divide-leo-border">
            {(interventions ?? []).map((i: any) => (
              <Link key={i.id} href={`/assets/${id}/interventions/${i.id}`} className="block p-3 text-sm hover:bg-leo-card/40">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-brand-cyan">{i.intervention_code}</span>
                      <Badge variant={CATEGORY_VARIANT[i.category] ?? "outline"} className="text-[10px]">{i.category}</Badge>
                      <Badge variant="outline" className="text-[10px]">{i.intervention_type.replace(/_/g, " ")}</Badge>
                      {i.functional_test_result && (
                        <Badge variant={i.functional_test_result === "conforme" ? "green" : "red"} className="text-[10px]">{i.functional_test_result}</Badge>
                      )}
                      {i.asset_blocked && <Badge variant="red" className="text-[10px]">asset bloccato</Badge>}
                    </div>
                    <div className="mt-1 text-xs text-leo-muted">
                      {i.completed_at && format(new Date(i.completed_at), "dd/MM/yyyy HH:mm")}
                      {i.technician_name && ` · ${i.technician_name}`}
                      {i.external_company && ` (${i.external_company})`}
                      {i.work_performed && ` · ${i.work_performed.slice(0, 80)}`}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-semibold">{Number(i.total_cost ?? 0).toLocaleString("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}</div>
                    {i.next_due_date && <div className="text-[10px] text-leo-muted">prossima {format(new Date(i.next_due_date), "dd/MM")}</div>}
                  </div>
                </div>
              </Link>
            ))}
            {(interventions?.length ?? 0) === 0 && (
              <div className="p-8 text-center text-sm text-leo-muted">
                <Wrench className="mx-auto mb-2 h-6 w-6" /> Nessun intervento ancora registrato
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
