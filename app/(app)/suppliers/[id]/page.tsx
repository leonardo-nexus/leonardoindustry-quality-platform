import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { Truck, TrendingDown, AlertOctagon, ShoppingCart, Package, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createServerClient } from "@/lib/supabase/server";
import { AuditTrailPanel } from "@/components/audit/audit-trail-panel";

const LEVEL_VARIANT: Record<string, "green" | "blue" | "yellow" | "orange" | "red"> = {
  eccellente: "green", affidabile: "blue", attenzione: "yellow", critico: "orange", inaffidabile: "red",
};

export default async function SupplierDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // id arriva URL-encoded come supplier_name
  const supplierName = decodeURIComponent(id);
  const supabase = await createServerClient();

  const { data: score } = await supabase
    .from("supplier_score")
    .select("*, company:company_id(name)")
    .eq("supplier_name", supplierName)
    .maybeSingle();

  const [orders, derogas, auths, ncMats] = await Promise.all([
    supabase.from("material_order").select("id, order_code, status, expected_delivery, total_value_euro, project:project_id(code)").eq("supplier_name", supplierName).is("deleted_at", null).order("created_at", { ascending: false }).limit(50),
    supabase.from("supplier_deroga").select("id, reason, risk_accepted, estimated_cost, signed_at, signer:signed_by_person_id(first_name,last_name)").in("material_order_id",
      ((await supabase.from("material_order").select("id").eq("supplier_name", supplierName)).data ?? []).map((o: any) => o.id)).order("signed_at", { ascending: false }),
    supabase.from("supplier_authorization").select("id, gate_type, status, production_signed_at, delivery_signed_at, created_at, order:material_order_id(order_code)").in("material_order_id",
      ((await supabase.from("material_order").select("id").eq("supplier_name", supplierName)).data ?? []).map((o: any) => o.id)).order("created_at", { ascending: false }).limit(50),
    supabase.from("material_nc").select("id, category, status, description, created_at").in("material_reception_id",
      ((await supabase.from("material_reception").select("id, material_order:material_order_id(supplier_name)").not("material_order_id", "is", null)).data ?? [])
        .filter((r: any) => r.material_order?.supplier_name === supplierName).map((r: any) => r.id)).limit(50),
  ]);

  if (!score && (orders.data?.length ?? 0) === 0) notFound();

  return (
    <>
      <PageHeader
        title={`Fornitore: ${supplierName}`}
        description={`${(score as any)?.company?.name ?? "—"} · ${score?.unauthorized_production_count ?? 0} produzioni non autorizzate · ${score?.forced_delivery_count ?? 0} consegne forzate`}
        actions={<Button asChild variant="outline"><Link href="/suppliers">← Fornitori</Link></Button>}
      />

      {/* Score card */}
      {score && (
        <Card className={`leo-card mb-6 border-2 ${score.level === "critico" || score.level === "inaffidabile" ? "border-status-red/40" : score.level === "attenzione" ? "border-status-orange/40" : "border-status-green/40"}`}>
          <CardContent className="p-6 flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-4">
              <Truck className="h-10 w-10 text-leo-muted" />
              <div>
                <div className="text-xs uppercase tracking-wider text-leo-muted">Score fornitore</div>
                <div className="text-5xl font-bold">{score.score}<span className="text-2xl text-leo-muted">/100</span></div>
                <Badge variant={LEVEL_VARIANT[score.level] ?? "outline"} className="mt-1">{score.level}</Badge>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-center text-xs">
              <Stat label="Prod. non autoriz." value={score.unauthorized_production_count} />
              <Stat label="Cons. non autoriz." value={score.unauthorized_delivery_count} />
              <Stat label="Cons. forzate" value={score.forced_delivery_count} />
              <Stat label="Danni" value={score.damage_count} />
              <Stat label="Doc incompleti" value={score.doc_incomplete_count} />
              <Stat label="Ritardi" value={score.delay_count} />
              <Stat label="NC aperte" value={score.nc_open_count} />
              <Stat label="Perdita €" value={Number(score.total_estimated_loss).toLocaleString("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })} />
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Ordini */}
        <Card className="leo-card">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><ShoppingCart className="h-4 w-4" /> Ordini ({orders.data?.length ?? 0})</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {(orders.data ?? []).map((o: any) => (
              <Link key={o.id} href={`/material-orders/${o.id}`} className="flex items-center justify-between rounded-md border border-leo-border bg-leo-card/40 px-3 py-2 text-xs hover:bg-leo-card">
                <span><span className="font-mono">{o.order_code}</span>{o.project?.code && ` · ${o.project.code}`}</span>
                <Badge variant="outline">{o.status}</Badge>
              </Link>
            ))}
            {(orders.data?.length ?? 0) === 0 && <p className="text-xs text-leo-muted">Nessun ordine</p>}
          </CardContent>
        </Card>

        {/* Autorizzazioni */}
        <Card className="leo-card">
          <CardHeader><CardTitle className="text-base">Autorizzazioni</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {(auths.data ?? []).map((a: any) => (
              <div key={a.id} className="flex items-center justify-between rounded-md border border-leo-border bg-leo-card/40 px-3 py-2 text-xs">
                <span><Badge variant="outline" className="mr-1">{a.gate_type}</Badge>{(a as any).order?.order_code}</span>
                <Badge variant={a.status === "autorizzata" ? "green" : "yellow"}>{a.status}</Badge>
              </div>
            ))}
            {(auths.data?.length ?? 0) === 0 && <p className="text-xs text-leo-muted">Nessuna autorizzazione</p>}
          </CardContent>
        </Card>

        {/* Deroghe */}
        <Card className="leo-card border-status-red/30 lg:col-span-2">
          <CardHeader><CardTitle className="text-base flex items-center gap-2 text-status-red"><AlertOctagon className="h-4 w-4" /> Deroghe ({derogas.data?.length ?? 0})</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {(derogas.data ?? []).map((d: any) => (
              <div key={d.id} className="rounded-md border border-status-red/30 bg-status-red/5 p-2 text-xs">
                <div className="font-medium">{d.reason}</div>
                <div className="text-leo-muted mt-1">
                  Rischio: {d.risk_accepted}
                  {d.estimated_cost && ` · €${Number(d.estimated_cost).toLocaleString("it-IT")}`}
                  · firmata da {(d as any).signer?.first_name} {(d as any).signer?.last_name} · {format(new Date(d.signed_at), "dd/MM/yyyy HH:mm")}
                </div>
              </div>
            ))}
            {(derogas.data?.length ?? 0) === 0 && <p className="text-xs text-leo-muted">Nessuna deroga</p>}
          </CardContent>
        </Card>

        {/* Audit log fornitore (filtra solo eventi entity_type=supplier_score con id matching) */}
        {score && (
          <div className="lg:col-span-2">
            <AuditTrailPanel entityType="supplier_score" entityId={score.id} showRevisions={false} />
          </div>
        )}

        {/* NC */}
        <Card className="leo-card lg:col-span-2">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-status-orange" /> NC materiali ({ncMats.data?.length ?? 0})</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {(ncMats.data ?? []).map((nc: any) => (
              <div key={nc.id} className="rounded-md border border-leo-border bg-leo-card/40 px-3 py-2 text-xs">
                <Badge variant="outline" className="mr-2">{nc.category}</Badge>
                {nc.description?.slice(0, 100)} · <span className="text-leo-muted">{format(new Date(nc.created_at), "dd/MM/yyyy")}</span>
              </div>
            ))}
            {(ncMats.data?.length ?? 0) === 0 && <p className="text-xs text-leo-muted">Nessuna NC</p>}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <div className="text-leo-muted">{label}</div>
      <div className="font-bold">{value}</div>
    </div>
  );
}
