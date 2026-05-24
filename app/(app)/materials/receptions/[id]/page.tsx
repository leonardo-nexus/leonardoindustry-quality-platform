import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { Camera, Package, CheckCircle2, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createServerClient } from "@/lib/supabase/server";
import { AuditTrailPanel } from "@/components/audit/audit-trail-panel";
import { ReceptionFlow } from "./reception-flow";

export default async function ReceptionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerClient();

  const { data: rec } = await supabase
    .from("material_reception")
    .select("*, project:project_id(code, name), assigned:assigned_to_person_id(first_name, last_name), signer:operator_signature_by(first_name, last_name)")
    .eq("id", id)
    .maybeSingle();
  if (!rec) notFound();

  return (
    <>
      <PageHeader
        title={`Ricezione ${rec.reception_code}`}
        description={`${(rec as any).project?.code ?? "—"} · operatore ${(rec as any).assigned?.first_name ?? "?"} ${(rec as any).assigned?.last_name ?? ""}`}
        actions={<Button asChild variant="outline"><Link href="/materials/receptions">← Ricezioni</Link></Button>}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Card className="leo-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Package className="h-4 w-4" /> Workflow ricezione</CardTitle>
            </CardHeader>
            <CardContent>
              <ReceptionFlow reception={rec} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="leo-card">
            <CardHeader>
              <CardTitle className="text-base">Stato</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row label="Stato" value={<Badge variant="outline">{rec.status.replace(/_/g, " ")}</Badge>} />
              <Row label="Conformità" value={<Badge variant={rec.conformity_status === "conforme" ? "green" : rec.conformity_status === "non_conforme" || rec.conformity_status === "bloccato" ? "red" : "yellow"}>{rec.conformity_status}</Badge>} />
              {rec.scheduled_for && <Row label="Pianificata" value={format(new Date(rec.scheduled_for), "dd/MM/yyyy")} />}
              {rec.taken_in_charge_at && <Row label="Presa in carico" value={format(new Date(rec.taken_in_charge_at), "dd/MM HH:mm")} />}
              {rec.operator_signature_at && (
                <Row label="Firmata" value={`${format(new Date(rec.operator_signature_at), "dd/MM HH:mm")} · ${(rec as any).signer?.first_name ?? ""} ${(rec as any).signer?.last_name ?? ""}`} />
              )}
              <Row label="Qty attesa" value={rec.expected_quantity ?? "—"} />
              <Row label="Qty bolla" value={rec.bolla_quantity ?? "—"} />
              <Row label="Qty contata" value={rec.counted_quantity ?? "—"} />
              <Row label="Dest. attesa" value={rec.expected_destination ?? "—"} />
              <Row label="Dest. effettiva" value={rec.actual_destination ?? "—"} />
              {rec.count_matches != null && (
                <Row label="Quantità OK" value={rec.count_matches ? "✓" : <span className="text-status-red">✗</span>} />
              )}
              {rec.destination_matches != null && (
                <Row label="Destinazione OK" value={rec.destination_matches ? "✓" : <span className="text-status-red">✗</span>} />
              )}
            </CardContent>
          </Card>

          <AuditTrailPanel entityType="material_reception" entityId={id} showRevisions={false} />
        </div>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-xs text-leo-muted">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  );
}
