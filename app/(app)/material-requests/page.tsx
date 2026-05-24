import Link from "next/link";
import { format } from "date-fns";
import { Plus, ClipboardList } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createServerClient } from "@/lib/supabase/server";

const STATUS_VARIANT: Record<string, "yellow" | "orange" | "green" | "red" | "gray" | "blue"> = {
  bozza: "gray", inviata: "yellow", approvata: "green", rifiutata: "red", in_ordine: "blue", annullata: "gray",
};

export default async function MaterialRequestsIndex() {
  const supabase = await createServerClient();
  const { data: reqs } = await supabase
    .from("material_request")
    .select("id, request_code, material_description, quantity, unit, status, needed_by, destination_country, destination_site, project:project_id(code), requester:requested_by(first_name,last_name)")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <>
      <PageHeader
        title="Richieste materiali"
        description="Origine catena materiale: codice, quantità, destinazione, scheda tecnica"
        actions={<Button asChild><Link href="/material-requests/new"><Plus className="mr-1 h-3 w-3" /> Nuova richiesta</Link></Button>}
      />
      <Card className="leo-card">
        <CardContent className="p-0">
          <div className="divide-y divide-leo-border">
            {(reqs ?? []).map((r: any) => (
              <Link key={r.id} href={`/material-requests/${r.id}`} className="flex items-center justify-between gap-2 p-3 text-sm hover:bg-leo-card/40">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-brand-cyan">{r.request_code}</span>
                    <span className="font-medium">{r.material_description}</span>
                  </div>
                  <div className="text-xs text-leo-muted">
                    {r.project?.code ?? "—"} · {r.quantity} {r.unit ?? ""} · {r.destination_country ?? "—"}{r.destination_site ? ` / ${r.destination_site}` : ""}
                    {r.needed_by && ` · richiesto entro ${format(new Date(r.needed_by), "dd/MM/yyyy")}`}
                    {r.requester && ` · ${r.requester.first_name} ${r.requester.last_name}`}
                  </div>
                </div>
                <Badge variant={STATUS_VARIANT[r.status] ?? "outline"}>{r.status.replace(/_/g, " ")}</Badge>
              </Link>
            ))}
            {(reqs?.length ?? 0) === 0 && (
              <div className="p-8 text-center text-sm text-leo-muted">
                <ClipboardList className="mx-auto mb-2 h-6 w-6" /> Nessuna richiesta materiale
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
