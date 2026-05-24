import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { Flame } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createServerClient } from "@/lib/supabase/server";
import { AuditTrailPanel } from "@/components/audit/audit-trail-panel";
import { MobileEvidenceLayer } from "@/components/mobile/mobile-evidence-layer";

const STATUS_VARIANT: Record<string, "green" | "yellow" | "gray" | "red"> = {
  valida: "green", bozza: "yellow", sospesa: "gray", obsoleta: "gray", non_conforme: "red",
};

export default async function WpsDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerClient();
  const { data: wps } = await supabase
    .from("wps")
    .select("*, company:company_id(name), process:welding_process_id(code, name)")
    .eq("id", id)
    .maybeSingle();
  if (!wps) notFound();

  const { data: welds } = await supabase
    .from("weld")
    .select("id, weld_number, status, welded_at, project:project_id(code)")
    .eq("wps_id", id)
    .order("welded_at", { ascending: false })
    .limit(20);

  return (
    <>
      <PageHeader
        title={`WPS ${wps.code} · rev. ${wps.revision}`}
        description={`${(wps as any).process?.code} ${(wps as any).process?.name ?? ""} · ${(wps as any).company?.name ?? "—"}`}
        actions={<Button asChild variant="outline"><Link href="/welding/wps">← WPS</Link></Button>}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Card className="leo-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Flame className="h-4 w-4 text-status-orange" /> Dati WPS</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row label="Codice" value={<span className="font-mono">{wps.code}</span>} />
              <Row label="Revisione" value={wps.revision} />
              <Row label="Stato" value={<Badge variant={STATUS_VARIANT[wps.status] ?? "outline"}>{wps.status}</Badge>} />
              <Row label="Processo saldatura" value={`${(wps as any).process?.code} · ${(wps as any).process?.name}`} />
              <Row label="Gruppo materiale" value={wps.material_group ?? "—"} />
              <Row label="Spessore min" value={wps.thickness_min_mm ? `${wps.thickness_min_mm} mm` : "—"} />
              <Row label="Spessore max" value={wps.thickness_max_mm ? `${wps.thickness_max_mm} mm` : "—"} />
              <Row label="Posizioni" value={wps.position_range ?? "—"} />
              {wps.notes && <Row label="Note" value={<span className="block whitespace-pre-line">{wps.notes}</span>} />}
            </CardContent>
          </Card>

          <Card className="leo-card">
            <CardHeader><CardTitle className="text-base">Saldature collegate ({welds?.length ?? 0})</CardTitle></CardHeader>
            <CardContent className="space-y-1">
              {(welds ?? []).map((w: any) => (
                <Link key={w.id} href={`/welding/welds/${w.id}`} className="flex items-center justify-between rounded-md border border-leo-border bg-leo-card/40 px-3 py-2 text-xs hover:bg-leo-card">
                  <span className="font-mono">{w.weld_number}</span>
                  <div className="flex gap-2">
                    {w.project?.code && <Badge variant="outline" className="text-[10px]">{w.project.code}</Badge>}
                    <Badge variant="outline" className="text-[10px]">{w.status}</Badge>
                  </div>
                </Link>
              ))}
              {(welds?.length ?? 0) === 0 && <p className="text-xs text-leo-muted">Nessuna saldatura</p>}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="leo-card">
            <CardHeader><CardTitle className="text-base">Evidenze WPS</CardTitle></CardHeader>
            <CardContent>
              <MobileEvidenceLayer
                context={{ entity_type: "wps", entity_id: id, company_id: wps.company_id, evidence_type: "documento_scansionato" }}
                allowed={["scan_documento", "allegato", "foto", "firma"]}
              />
            </CardContent>
          </Card>
          <AuditTrailPanel entityType="wps" entityId={id} showRevisions />
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
