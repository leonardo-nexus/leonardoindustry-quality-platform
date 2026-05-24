import Link from "next/link";
import { Package, Lock } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createServerClient } from "@/lib/supabase/server";

const STATUS_VARIANT: Record<string, "yellow" | "orange" | "green" | "red" | "gray"> = {
  in_attesa_verifica: "yellow", verificato: "green", bloccato: "red", utilizzato: "gray", scartato: "gray",
  da_controllare: "yellow", approvato: "green", rifiutato: "red",
};

export default async function MaterialsIndexPage() {
  const supabase = await createServerClient();
  const { data: lots } = await supabase
    .from("material_lot")
    .select("id, lot_code, material_description, material_grade, quantity, unit, status, block_reason, project:project_id(id, code, name), company:company_id(name)")
    .is("deleted_at", null)
    .order("status", { ascending: false })
    .limit(200);

  const blockedCount = (lots ?? []).filter((l: any) => l.status === "bloccato").length;
  const verifiedCount = (lots ?? []).filter((l: any) => l.status === "verificato").length;

  return (
    <>
      <PageHeader
        title="Materiali — gruppo"
        description={`${lots?.length ?? 0} lotti totali · ${blockedCount} bloccati · ${verifiedCount} verificati`}
      />

      <Card className="leo-card">
        <CardHeader>
          <CardTitle className="text-base">Tutti i lotti</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {(lots ?? []).length === 0 ? (
            <p className="text-sm text-leo-muted text-center py-6">Nessun lotto registrato</p>
          ) : (
            (lots ?? []).map((l: any) => (
              <Link key={l.id} href={`/materials/${l.id}`} className="flex items-center justify-between rounded-md border border-leo-border bg-leo-card/40 px-3 py-2 text-sm hover:bg-leo-card">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {l.status === "bloccato" && <Lock className="h-3 w-3 text-status-red" />}
                    <span className="font-mono text-xs text-brand-cyan">{l.lot_code}</span>
                    <span className="ml-1 truncate">{l.material_description ?? l.material_grade}</span>
                  </div>
                  <div className="text-xs text-leo-muted">
                    {l.project?.code ?? "—"} · {l.company?.name ?? "—"}
                    {l.block_reason && <> · <span className="text-status-red">{l.block_reason}</span></>}
                  </div>
                </div>
                <Badge variant={STATUS_VARIANT[l.status] ?? "outline"}>{l.status.replace(/_/g, " ")}</Badge>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </>
  );
}
