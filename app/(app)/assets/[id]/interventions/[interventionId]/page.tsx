import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { Wrench, Euro, ShieldCheck, Calendar, AlertTriangle, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createServerClient } from "@/lib/supabase/server";
import { AuditTrailPanel } from "@/components/audit/audit-trail-panel";
import { MobileEvidenceLayer } from "@/components/mobile/mobile-evidence-layer";

export default async function InterventionDetailPage({ params }: { params: Promise<{ id: string; interventionId: string }> }) {
  const { id: assetId, interventionId } = await params;
  const supabase = await createServerClient();

  const { data: int } = await supabase
    .from("asset_intervention")
    .select("*, asset:asset_id(code, name, status), performer:performed_by(first_name, last_name), responsible:next_due_responsible_id(first_name, last_name), signer:technician_signature_by(first_name, last_name)")
    .eq("id", interventionId)
    .maybeSingle();
  if (!int) notFound();

  return (
    <>
      <PageHeader
        title={`${int.intervention_code} · ${(int as any).asset?.name}`}
        description={`${int.intervention_type.replace(/_/g, " ")} · ${int.category}`}
        actions={<Button asChild variant="outline"><Link href={`/assets/${assetId}/interventions`}>← Interventi</Link></Button>}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          {/* Banner stato critico */}
          {int.asset_blocked && (
            <div className="rounded-md border-2 border-status-red/40 bg-status-red/10 p-3 alert-critical-pulse">
              <p className="text-sm font-bold text-status-red"><AlertTriangle className="inline h-4 w-4 mr-1" /> ASSET BLOCCATO dopo questo intervento</p>
              {int.usage_limitations && <p className="text-xs text-status-red mt-1">Limitazioni: {int.usage_limitations}</p>}
            </div>
          )}
          {int.functional_test_result === "non_conforme" && (
            <div className="rounded-md border-2 border-status-red/40 bg-status-red/10 p-3">
              <p className="text-sm font-bold text-status-red">⚠ ESITO NON CONFORME → NC aperta automaticamente</p>
            </div>
          )}

          {/* Descrizione tecnica */}
          <Card className="leo-card">
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Wrench className="h-4 w-4" /> Descrizione tecnica</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row label="Problema" value={int.issue_found ?? "—"} multiline />
              <Row label="Diagnosi" value={int.diagnosis ?? "—"} multiline />
              <Row label="Lavoro eseguito" value={int.work_performed ?? "—"} multiline />
              <Row label="Esito test" value={int.functional_test_result ? <Badge variant={int.functional_test_result === "conforme" ? "green" : int.functional_test_result === "non_conforme" ? "red" : "yellow"}>{int.functional_test_result}</Badge> : "—"} />
              <Row label="Asset utilizzabile" value={int.asset_usable ? "Sì ✓" : <span className="text-status-red">NO</span>} />
              <Row label="Stato dopo" value={int.status_after ?? "—"} />
            </CardContent>
          </Card>

          {/* Costi */}
          <Card className="leo-card">
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Euro className="h-4 w-4" /> Costi</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
              <Row label="Manodopera" value={`${Number(int.labor_cost ?? 0).toLocaleString("it-IT", { style: "currency", currency: "EUR" })} · ${int.labor_hours ?? 0}h`} />
              <Row label="Ricambi" value={Number(int.parts_cost ?? 0).toLocaleString("it-IT", { style: "currency", currency: "EUR" })} />
              <Row label="Trasferta" value={Number(int.travel_cost ?? 0).toLocaleString("it-IT", { style: "currency", currency: "EUR" })} />
              <div className="border-t border-leo-border my-2"></div>
              <Row label="TOTALE" value={<span className="text-lg font-bold">{Number(int.total_cost ?? 0).toLocaleString("it-IT", { style: "currency", currency: "EUR" })}</span>} />
              <Row label="Fornitore" value={int.supplier_name ?? int.external_company ?? "—"} />
              {int.invoice_number && <Row label="Fattura/Preventivo" value={int.invoice_number} />}
            </CardContent>
          </Card>

          {/* Garanzia */}
          {int.in_warranty && (
            <Card className="leo-card border-status-green/30">
              <CardHeader><CardTitle className="flex items-center gap-2 text-base text-status-green"><ShieldCheck className="h-4 w-4" /> Garanzia</CardTitle></CardHeader>
              <CardContent className="space-y-1 text-sm">
                <Row label="In garanzia" value="Sì ✓" />
                <Row label="Valida fino al" value={int.warranty_until ? format(new Date(int.warranty_until), "dd/MM/yyyy") : "—"} />
                <Row label="Riferimento" value={int.warranty_reference ?? "—"} />
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          {/* Anagrafica + scadenze */}
          <Card className="leo-card">
            <CardHeader><CardTitle className="text-base">Riepilogo</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row label="Asset" value={`${(int as any).asset?.code} · ${(int as any).asset?.name}`} />
              <Row label="Tipo" value={int.intervention_type.replace(/_/g, " ")} />
              <Row label="Categoria" value={<Badge variant="outline">{int.category}</Badge>} />
              <Row label="Origine" value={int.origin ?? "—"} />
              {int.completed_at && <Row label="Completato" value={format(new Date(int.completed_at), "dd/MM/yyyy HH:mm")} />}
              <Row label="Eseguito da" value={`${(int as any).performer?.first_name ?? ""} ${(int as any).performer?.last_name ?? ""}`} />
              {int.external_company && <Row label="Azienda esterna" value={int.external_company} />}
              {int.technician_name && <Row label="Tecnico" value={int.technician_name} />}
              {int.technician_signature_at && (
                <Row label="Firma tecnica" value={<span className="text-status-green"><CheckCircle2 className="inline h-3 w-3" /> {(int as any).signer?.first_name} {(int as any).signer?.last_name} · {format(new Date(int.technician_signature_at), "dd/MM HH:mm")}</span>} />
              )}
            </CardContent>
          </Card>

          {/* Prossima scadenza */}
          {int.next_due_date && (
            <Card className="leo-card border-brand-cyan/30">
              <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Calendar className="h-4 w-4 text-brand-cyan" /> Prossima scadenza</CardTitle></CardHeader>
              <CardContent className="space-y-1 text-sm">
                <Row label="Data" value={<strong>{format(new Date(int.next_due_date), "dd/MM/yyyy")}</strong>} />
                <Row label="Tipo" value={int.next_due_type ?? "—"} />
                <Row label="Responsabile" value={`${(int as any).responsible?.first_name ?? ""} ${(int as any).responsible?.last_name ?? ""}`} />
                <Row label="Frequenza" value={int.next_due_frequency_days ? `${int.next_due_frequency_days} giorni` : "—"} />
                <p className="text-xs text-leo-muted mt-2">✓ Task creato in /my-work del responsabile · evento in /calendar</p>
              </CardContent>
            </Card>
          )}

          <Card className="leo-card">
            <CardHeader>
              <CardTitle className="text-base">Evidenze mobile intervento</CardTitle>
            </CardHeader>
            <CardContent>
              <MobileEvidenceLayer
                context={{
                  entity_type: "asset_intervention",
                  entity_id: interventionId,
                  company_id: int.company_id,
                  project_id: int.project_id,
                  evidence_type: "foto_controllo",
                }}
                allowed={["foto", "scan_documento", "allegato", "firma"]}
              />
            </CardContent>
          </Card>

          <AuditTrailPanel entityType="asset_intervention" entityId={interventionId} showRevisions={false} />
        </div>
      </div>
    </>
  );
}

function Row({ label, value, multiline }: { label: string; value: any; multiline?: boolean }) {
  return (
    <div className={multiline ? "block" : "flex items-baseline justify-between gap-2"}>
      <span className="text-xs text-leo-muted">{label}</span>
      <span className={multiline ? "block mt-0.5 whitespace-pre-line" : ""}>{value}</span>
    </div>
  );
}
