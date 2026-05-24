import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { Award } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createServerClient } from "@/lib/supabase/server";
import { AuditTrailPanel } from "@/components/audit/audit-trail-panel";
import { MobileEvidenceLayer } from "@/components/mobile/mobile-evidence-layer";

const STATUS_VARIANT: Record<string, "green" | "yellow" | "red" | "gray"> = {
  valida: "green", in_emissione: "yellow", scaduta: "red", obsoleta: "gray",
};

export default async function WpqrDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerClient();
  const { data: wpqr } = await supabase
    .from("wpqr")
    .select("*, wps:wps_id(id, code, revision, company_id)")
    .eq("id", id)
    .maybeSingle();
  if (!wpqr) notFound();

  const companyId = (wpqr as any).wps?.company_id;
  const isExpired = wpqr.expiry_date && new Date(wpqr.expiry_date) < new Date();

  return (
    <>
      <PageHeader
        title={`WPQR ${wpqr.certificate_code}`}
        description={`Certifica WPS ${(wpqr as any).wps?.code ?? "—"}`}
        actions={<Button asChild variant="outline"><Link href="/welding/wpqr">← WPQR</Link></Button>}
      />

      {isExpired && (
        <div className="mb-4 rounded-md border-2 border-status-red/40 bg-status-red/10 p-3 alert-critical-pulse">
          <p className="text-sm font-bold text-status-red">⚠ WPQR SCADUTA — non utilizzabile per saldature</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Card className="leo-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Award className="h-4 w-4 text-brand-cyan" /> Dati WPQR</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row label="Certificato" value={<span className="font-mono">{wpqr.certificate_code}</span>} />
              <Row label="Emissione" value={wpqr.issue_date ? format(new Date(wpqr.issue_date), "dd/MM/yyyy") : "—"} />
              <Row label="Scadenza" value={wpqr.expiry_date ? format(new Date(wpqr.expiry_date), "dd/MM/yyyy") : "—"} />
              <Row label="Stato" value={<Badge variant={STATUS_VARIANT[wpqr.status] ?? "outline"}>{wpqr.status}</Badge>} />
              <Row label="WPS collegata" value={<Link href={`/welding/wps/${(wpqr as any).wps?.id}`} className="text-brand-cyan underline">{(wpqr as any).wps?.code} rev.{(wpqr as any).wps?.revision}</Link>} />
              {wpqr.notes && <Row label="Note" value={<span className="block whitespace-pre-line">{wpqr.notes}</span>} />}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="leo-card">
            <CardHeader><CardTitle className="text-base">Evidenze WPQR</CardTitle></CardHeader>
            <CardContent>
              <MobileEvidenceLayer
                context={{ entity_type: "wpqr", entity_id: id, company_id: companyId, evidence_type: "documento_scansionato" }}
                allowed={["scan_documento", "allegato", "foto", "firma"]}
              />
            </CardContent>
          </Card>
          <AuditTrailPanel entityType="wpqr" entityId={id} showRevisions />
        </div>
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
