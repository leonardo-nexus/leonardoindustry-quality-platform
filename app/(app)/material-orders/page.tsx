import Link from "next/link";
import { format } from "date-fns";
import { ShoppingCart, Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createServerClient } from "@/lib/supabase/server";

const STATUS_VARIANT: Record<string, "yellow" | "orange" | "green" | "red" | "gray" | "blue"> = {
  da_inviare: "gray", inviato: "yellow", confermato: "yellow", in_produzione: "orange",
  in_spedizione: "orange", consegnato: "green", annullato: "gray", non_autorizzato: "red",
};

export default async function MaterialOrdersIndex() {
  const supabase = await createServerClient();
  const { data: orders } = await supabase
    .from("material_order")
    .select("id, order_code, supplier_name, status, expected_delivery, destination_country, destination_site, total_value_euro, project:project_id(code)")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <>
      <PageHeader
        title="Ordini materiali"
        description="Ordini fornitore con gate produzione/consegna/ricezione"
        actions={<Button asChild><Link href="/material-orders/new"><Plus className="mr-1 h-3 w-3" /> Nuovo ordine</Link></Button>}
      />
      <Card className="leo-card">
        <CardContent className="p-0">
          <div className="divide-y divide-leo-border">
            {(orders ?? []).map((o: any) => (
              <Link key={o.id} href={`/material-orders/${o.id}`} className="flex items-center justify-between gap-2 p-3 text-sm hover:bg-leo-card/40">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4 text-leo-muted shrink-0" />
                    <span className="font-mono text-xs text-brand-cyan">{o.order_code}</span>
                    <span className="font-medium">{o.supplier_name}</span>
                  </div>
                  <div className="text-xs text-leo-muted">
                    {o.project?.code ?? "—"} · → {o.destination_country ?? "—"}{o.destination_site ? ` / ${o.destination_site}` : ""}
                    {o.expected_delivery && ` · consegna ${format(new Date(o.expected_delivery), "dd/MM/yyyy")}`}
                    {o.total_value_euro && ` · ${Number(o.total_value_euro).toLocaleString("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}`}
                  </div>
                </div>
                <Badge variant={STATUS_VARIANT[o.status] ?? "outline"}>{o.status.replace(/_/g, " ")}</Badge>
              </Link>
            ))}
            {(orders?.length ?? 0) === 0 && (
              <div className="p-8 text-center text-sm text-leo-muted">
                <ShoppingCart className="mx-auto mb-2 h-6 w-6" /> Nessun ordine
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
