import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { Lock, ShieldAlert, Package } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createServerClient } from "@/lib/supabase/server";
import { LossPreventionBanner } from "@/components/quality/loss-prevention-banner";
import { AuditTrailPanel } from "@/components/audit/audit-trail-panel";
import { canUseMaterial, blockersToBannerItems } from "@/lib/quality/loss-prevention";
import { VerifyMaterialButton, RecheckButton } from "../../projects/[id]/materials/material-actions-ui";

const STATUS_VARIANT: Record<string, "yellow" | "orange" | "green" | "red" | "gray"> = {
  in_attesa_verifica: "yellow", verificato: "green", bloccato: "red", utilizzato: "gray", scartato: "gray",
  da_controllare: "yellow", approvato: "green", rifiutato: "red",
};

export default async function MaterialDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerClient();

  const { data: lot } = await supabase
    .from("material_lot")
    .select("*, project:project_id(id, code, name), company:company_id(name), sheet:technical_sheet_id(id, code, title, status), live_check:live_check_by(first_name, last_name)")
    .eq("id", id)
    .maybeSingle();
  if (!lot) notFound();

  const gate = await canUseMaterial(id);
  const banner = blockersToBannerItems(gate.blockers);

  return (
    <>
      <PageHeader
        title={`Lotto ${lot.lot_code}`}
        description={`${lot.material_description ?? lot.material_grade} · ${(lot as any).company?.name ?? "—"}`}
        actions={
          <div className="flex gap-2">
            {(lot as any).project && <Button asChild variant="outline"><Link href={`/projects/${(lot as any).project.id}/materials`}>← Commessa</Link></Button>}
            <Button asChild variant="outline"><Link href="/materials">Tutti i lotti</Link></Button>
          </div>
        }
      />

      {!gate.is_usable && (
        <LossPreventionBanner items={banner} title="LOTTO MATERIALE NON UTILIZZABILE" />
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Card className={`leo-card ${!gate.is_usable ? "border-status-red/40" : ""}`}>
            <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  {!gate.is_usable && <Lock className="h-4 w-4 text-status-red" />}
                  <Package className="h-4 w-4" /> Anagrafica lotto
                </CardTitle>
                <div className="mt-2 flex items-center gap-2">
                  <Badge variant={STATUS_VARIANT[lot.status] ?? "outline"}>{lot.status.replace(/_/g, " ")}</Badge>
                  {(lot as any).project && <Badge variant="outline" className="text-[10px]">{(lot as any).project.code}</Badge>}
                </div>
              </div>
              <div className="flex flex-col gap-1 items-end">
                <VerifyMaterialButton lotId={id} projectId={(lot as any).project?.id ?? ""} disabled={!gate.is_usable} />
                <RecheckButton lotId={id} projectId={(lot as any).project?.id ?? ""} />
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row label="Codice lotto" value={lot.lot_code} />
              <Row label="Heat / colata" value={lot.heat_number} />
              <Row label="Grade materiale" value={lot.material_grade} />
              <Row label="Descrizione" value={lot.material_description} />
              <Row label="Quantità" value={lot.quantity ? `${lot.quantity} ${lot.unit ?? ""}` : null} />
              <Row label="Fornitore" value={lot.supplier_name} />
              <Row label="Spessore" value={lot.thickness_mm ? `${lot.thickness_mm} mm` : null} />
              <Row label="Certificato" value={lot.certificate_code ?? (lot.certificate_file_id ? "Caricato" : "Mancante")} />
              <Row label="Scheda tecnica" value={(lot as any).sheet ? `${(lot as any).sheet.code} · ${(lot as any).sheet.title} (${(lot as any).sheet.status})` : "Non collegata"} />
              <Row label="Foto live" value={lot.live_photo_id ? "Presente" : "Mancante"} />
              {lot.live_check_at && (
                <Row label="Verifica live" value={`${format(new Date(lot.live_check_at), "dd/MM/yyyy HH:mm")} · ${(lot as any).live_check?.first_name ?? ""} ${(lot as any).live_check?.last_name ?? ""}`} />
              )}
              {lot.block_reason && (
                <div className="mt-3 rounded-md border border-status-red/30 bg-status-red/5 p-2 text-xs text-status-red">
                  <ShieldAlert className="inline h-3 w-3 mr-1" /> Motivo blocco: {lot.block_reason}
                </div>
              )}
              {lot.notes && <Row label="Note" value={lot.notes} />}
            </CardContent>
          </Card>

          {/* Gate dettaglio */}
          <Card className={`leo-card ${gate.is_usable ? "border-status-green/40" : "border-status-red/40"}`}>
            <CardHeader>
              <CardTitle className="text-base">Gate canUseMaterial()</CardTitle>
            </CardHeader>
            <CardContent>
              {gate.is_usable ? (
                <p className="text-sm text-status-green">✓ Tutti i controlli superati. Il materiale può essere utilizzato.</p>
              ) : (
                <ul className="space-y-1.5 text-sm">
                  {gate.blockers.map((b: any, i: number) => (
                    <li key={i} className="flex items-start gap-2 rounded-md border border-status-red/30 bg-status-red/5 px-2 py-1.5">
                      <Lock className="mt-0.5 h-3 w-3 shrink-0 text-status-red" />
                      <span>
                        <strong>{b.label}</strong>
                        <span className="ml-2 text-leo-muted italic">— {b.detail}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <AuditTrailPanel entityType="material_lot" entityId={id} showRevisions />
        </div>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: any }) {
  if (value == null || value === "") return null;
  return (
    <div className="flex items-baseline gap-2">
      <span className="w-32 shrink-0 text-xs text-leo-muted">{label}</span>
      <span className="font-medium">{String(value)}</span>
    </div>
  );
}
