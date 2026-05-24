import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { CheckCircle2, XCircle } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createServerClient } from "@/lib/supabase/server";
import { AuditTrailPanel } from "@/components/audit/audit-trail-panel";
import { ApproveRejectButtons } from "./approve-reject";

export default async function MaterialRequestDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerClient();
  const { data: req } = await supabase
    .from("material_request")
    .select("*, project:project_id(code, name), requester:requested_by(first_name, last_name), approver:approved_by(first_name, last_name), sheet:technical_sheet_id(code, title, status)")
    .eq("id", id)
    .maybeSingle();
  if (!req) notFound();

  return (
    <>
      <PageHeader
        title={`Richiesta ${req.request_code}`}
        description={req.material_description}
        actions={
          <div className="flex gap-2">
            {req.status === "inviata" && <ApproveRejectButtons requestId={id} />}
            <Button asChild variant="outline"><Link href="/material-requests">← Richieste</Link></Button>
          </div>
        }
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Card className="leo-card">
            <CardHeader><CardTitle className="text-base">Dettagli</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row label="Stato" value={<Badge variant="outline">{req.status}</Badge>} />
              <Row label="Quantità" value={`${req.quantity ?? "—"} ${req.unit ?? ""}`} />
              <Row label="Destinazione" value={`${req.destination_country ?? "—"}${req.destination_site ? ` · ${req.destination_site}` : ""}`} />
              <Row label="Necessario entro" value={req.needed_by ? format(new Date(req.needed_by), "dd/MM/yyyy") : "—"} />
              <Row label="Commessa" value={(req as any).project?.code ?? "—"} />
              <Row label="Scheda tecnica" value={(req as any).sheet ? `${(req as any).sheet.code} (${(req as any).sheet.status})` : "Nessuna"} />
              <Row label="Richiedente" value={`${(req as any).requester?.first_name ?? ""} ${(req as any).requester?.last_name ?? ""}`} />
              {req.approved_at && <Row label="Approvata da" value={`${(req as any).approver?.first_name ?? ""} ${(req as any).approver?.last_name ?? ""} il ${format(new Date(req.approved_at), "dd/MM HH:mm")}`} />}
              {req.notes && <Row label="Note" value={req.notes} />}
            </CardContent>
          </Card>

          {req.status === "approvata" && (
            <Card className="leo-card border-status-green/40">
              <CardContent className="p-4">
                <p className="text-sm text-status-green">✓ Richiesta approvata. Crea un ordine fornitore collegato:</p>
                <Button asChild className="mt-2"><Link href={`/material-orders/new?material_request_id=${id}`}>Crea ordine →</Link></Button>
              </CardContent>
            </Card>
          )}
        </div>
        <AuditTrailPanel entityType="material_request" entityId={id} showRevisions={false} />
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
