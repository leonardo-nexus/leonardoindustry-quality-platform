import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { CheckCircle2, AlertOctagon, Truck, Package } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createServerClient } from "@/lib/supabase/server";
import { AuditTrailPanel } from "@/components/audit/audit-trail-panel";
import { LossPreventionBanner } from "@/components/quality/loss-prevention-banner";
import { canSupplierProduce, canSupplierDeliver, canReceiveMaterial } from "@/lib/quality/supplier-gates";
import { blockersToBannerItems } from "@/lib/quality/loss-prevention";
import { OrderActions } from "./order-actions";
import { OrderEditPanel } from "./order-edit-panel";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerClient();
  const { data: order } = await supabase
    .from("material_order")
    .select("*, project:project_id(code, name), request:material_request_id(request_code, material_description)")
    .eq("id", id)
    .maybeSingle();
  if (!order) notFound();

  const [prodGate, delGate, rcvGate, auths, derogas, receptions, people] = await Promise.all([
    canSupplierProduce(id),
    canSupplierDeliver(id),
    canReceiveMaterial(id),
    supabase.from("supplier_authorization").select("*").eq("material_order_id", id).order("created_at", { ascending: false }),
    supabase.from("supplier_deroga").select("*, signer:signed_by_person_id(first_name,last_name)").eq("material_order_id", id).order("signed_at", { ascending: false }),
    supabase.from("material_reception").select("id, reception_code, status, conformity_status").eq("material_order_id", id),
    supabase.from("person").select("id, first_name, last_name, role:role_id(code)").eq("active", true).order("last_name"),
  ]);

  const magazzini = (people.data ?? []).filter((p: any) => ["magazzino", "operatore", "capo_cantiere", "capo_officina"].includes(p.role?.code ?? ""));

  return (
    <>
      <PageHeader
        title={`Ordine ${order.order_code}`}
        description={`${order.supplier_name} · ${order.destination_country ?? "—"}${order.destination_site ? ` / ${order.destination_site}` : ""}`}
        actions={<Button asChild variant="outline"><Link href="/material-orders">← Ordini</Link></Button>}
      />

      {/* Banner gate */}
      {!prodGate.is_unlocked && order.status === "in_produzione" && (
        <LossPreventionBanner items={blockersToBannerItems(prodGate.blockers)} title="GATE PRODUZIONE NON AUTORIZZATO" />
      )}
      {!delGate.is_unlocked && order.status === "in_spedizione" && (
        <LossPreventionBanner items={blockersToBannerItems(delGate.blockers)} title="GATE CONSEGNA BLOCCATO" />
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          {/* Dettagli */}
          <Card className="leo-card">
            <CardHeader><CardTitle className="text-base">Dettagli ordine</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row label="Stato" value={<Badge variant="outline">{order.status}</Badge>} />
              <Row label="Fornitore" value={<Link href={`/suppliers/${encodeURIComponent(order.supplier_name)}`} className="text-brand-cyan underline">{order.supplier_name}</Link>} />
              <Row label="Email fornitore" value={order.supplier_email ?? "—"} />
              <Row label="Richiesta collegata" value={(order as any).request ? `${(order as any).request.request_code} · ${(order as any).request.material_description}` : "Diretta"} />
              <Row label="Data ordine" value={order.order_date ? format(new Date(order.order_date), "dd/MM/yyyy") : "—"} />
              <Row label="Consegna prevista" value={order.expected_delivery ? format(new Date(order.expected_delivery), "dd/MM/yyyy") : "—"} />
              <Row label="Valore" value={order.total_value_euro ? Number(order.total_value_euro).toLocaleString("it-IT", { style: "currency", currency: "EUR" }) : "—"} />
              <Row label="Commessa" value={(order as any).project?.code ?? "—"} />
            </CardContent>
          </Card>

          {/* Edit panel */}
          <Card className="leo-card">
            <CardHeader><CardTitle className="text-base">Modifica ordine</CardTitle></CardHeader>
            <CardContent><OrderEditPanel order={order} /></CardContent>
          </Card>

          {/* Action buttons */}
          <OrderActions order={order} prodGateUnlocked={prodGate.is_unlocked} delGateUnlocked={delGate.is_unlocked} magazzini={magazzini} />

          {/* Autorizzazioni */}
          <Card className="leo-card">
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Autorizzazioni</CardTitle></CardHeader>
            <CardContent className="space-y-1">
              {(auths.data?.length ?? 0) === 0 && <p className="text-xs text-leo-muted">Nessuna autorizzazione ancora</p>}
              {(auths.data ?? []).map((a: any) => (
                <div key={a.id} className="flex items-center justify-between rounded-md border border-leo-border bg-leo-card/40 px-3 py-2 text-xs">
                  <div>
                    <Badge variant="outline" className="mr-2">{a.gate_type}</Badge>
                    {a.status} {a.production_signed_at && `· prod firmato ${format(new Date(a.production_signed_at), "dd/MM HH:mm")}`}
                    {a.delivery_signed_at && `· consegna firmata ${format(new Date(a.delivery_signed_at), "dd/MM HH:mm")}`}
                  </div>
                  <Badge variant={a.status === "autorizzata" ? "green" : "yellow"}>{a.status}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Deroghe */}
          {(derogas.data?.length ?? 0) > 0 && (
            <Card className="leo-card border-status-red/40">
              <CardHeader><CardTitle className="text-base flex items-center gap-2 text-status-red"><AlertOctagon className="h-4 w-4" /> Deroghe firmate</CardTitle></CardHeader>
              <CardContent className="space-y-1">
                {(derogas.data ?? []).map((d: any) => (
                  <div key={d.id} className="rounded-md border border-status-red/30 bg-status-red/5 p-2 text-xs">
                    <div className="font-medium">{d.reason}</div>
                    <div className="text-leo-muted mt-1">
                      Rischio: {d.risk_accepted}
                      {d.estimated_cost && ` · costo stimato ${Number(d.estimated_cost).toLocaleString("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}`}
                      · firmata da {d.signer?.first_name} {d.signer?.last_name} · {format(new Date(d.signed_at), "dd/MM/yyyy HH:mm")}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Ricezioni */}
          <Card className="leo-card">
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Package className="h-4 w-4" /> Ricezioni</CardTitle></CardHeader>
            <CardContent className="space-y-1">
              {(receptions.data?.length ?? 0) === 0 && <p className="text-xs text-leo-muted">Nessuna ricezione ancora</p>}
              {(receptions.data ?? []).map((r: any) => (
                <Link key={r.id} href={`/materials/receptions/${r.id}`} className="flex items-center justify-between rounded-md border border-leo-border bg-leo-card/40 px-3 py-2 text-xs hover:bg-leo-card">
                  <span className="font-mono">{r.reception_code}</span>
                  <div className="flex gap-1">
                    <Badge variant="outline">{r.status}</Badge>
                    {r.conformity_status && <Badge variant="outline">{r.conformity_status}</Badge>}
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>

        <AuditTrailPanel entityType="material_order" entityId={id} showRevisions={false} />
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-xs text-leo-muted">{label}</span>
      <span>{value}</span>
    </div>
  );
}
