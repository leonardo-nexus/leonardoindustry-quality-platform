import Link from "next/link";
import { format } from "date-fns";
import { Inbox, Package } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createServerClient } from "@/lib/supabase/server";

const STATUS_VARIANT: Record<string, "yellow" | "orange" | "green" | "red" | "gray"> = {
  attesa_controllo: "yellow", in_corso: "orange", firmata: "yellow", approvata: "green", bloccata: "red", NC_aperta: "red", archiviata: "gray",
};

export default async function ReceptionsIndexPage() {
  const supabase = await createServerClient();
  const { data: receptions } = await supabase
    .from("material_reception")
    .select("id, reception_code, status, scheduled_for, conformity_status, project:project_id(code), assigned:assigned_to_person_id(first_name,last_name)")
    .is("deleted_at", null)
    .order("scheduled_for", { ascending: false })
    .limit(100);

  return (
    <>
      <PageHeader
        title="Ricezioni materiali"
        description="Workflow ricezione: assegnata, foto live, conteggio, firma operatore, esito"
      />
      <Card className="leo-card">
        <CardContent className="p-0">
          <div className="divide-y divide-leo-border">
            {(receptions ?? []).map((r: any) => (
              <Link key={r.id} href={`/materials/receptions/${r.id}`} className="flex items-center justify-between gap-2 p-3 text-sm hover:bg-leo-card/40">
                <div className="flex items-center gap-3 min-w-0">
                  <Package className="h-4 w-4 shrink-0 text-leo-muted" />
                  <div>
                    <div className="font-mono text-xs text-brand-cyan">{r.reception_code}</div>
                    <div className="text-xs text-leo-muted">
                      {r.project?.code ?? "—"} · operatore {r.assigned?.first_name ?? "?"} {r.assigned?.last_name ?? ""}
                      {r.scheduled_for && ` · ${format(new Date(r.scheduled_for), "dd/MM/yyyy")}`}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  {r.conformity_status && <Badge variant="outline" className="text-[10px]">{r.conformity_status}</Badge>}
                  <Badge variant={STATUS_VARIANT[r.status] ?? "outline"}>{r.status.replace(/_/g, " ")}</Badge>
                </div>
              </Link>
            ))}
            {(receptions?.length ?? 0) === 0 && (
              <div className="p-8 text-center text-sm text-leo-muted">
                <Inbox className="mx-auto mb-2 h-6 w-6" /> Nessuna ricezione registrata
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
