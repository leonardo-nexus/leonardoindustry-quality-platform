import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { Truck, ShieldCheck, Lock, AlertOctagon, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createServerClient } from "@/lib/supabase/server";
import { AuditTrailPanel } from "@/components/audit/audit-trail-panel";
import { QualificationEditor } from "./editor";

const STATUS_VARIANT: Record<string, "green" | "blue" | "yellow" | "orange" | "red"> = {
  qualified_excellent: "green", qualified: "blue", qualified_with_reserve: "yellow",
  conditional: "yellow", suspended: "orange", blocked: "red", not_qualified: "red",
  expired: "red", pending: "yellow",
};

export default async function QualificationDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ source?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const supabase = await createServerClient();

  const { data: q } = await supabase
    .from("supplier_qualification")
    .select("*, company:company_id(name), approver:approved_by(first_name, last_name), reviewer:reviewed_by(first_name, last_name)")
    .eq("id", id)
    .maybeSingle();
  if (!q) notFound();

  const { data: docs } = await supabase
    .from("qualification_document")
    .select("*")
    .eq("qualification_id", id)
    .order("document_type");

  const { data: outbox } = await supabase
    .from("sync_outbox")
    .select("id, action, status, attempts, last_error, created_at, sent_at")
    .eq("entity_type", "supplier_qualification")
    .eq("entity_id", id)
    .order("created_at", { ascending: false })
    .limit(10);

  const isFromErp = sp.source === "erp";

  return (
    <>
      <PageHeader
        title={`${q.legal_name}`}
        description={`${q.supplier_name} · ${q.country ?? "—"} · ${(q as any).company?.name ?? "—"}`}
        actions={
          <div className="flex gap-2">
            {isFromErp && (
              <>
                <Badge variant="outline" className="bg-brand-blue/10 text-brand-cyan border-brand-cyan/40">
                  Aperto da ERP
                </Badge>
                <Button asChild variant="outline" size="sm">
                  <a href={process.env.ERP_RETURN_URL ?? "/"}>← Torna a ERP</a>
                </Button>
              </>
            )}
            <Button asChild variant="outline"><Link href="/suppliers/qualification">← Lista</Link></Button>
          </div>
        }
      />

      {/* Banner blocco */}
      {q.blocked_for_orders && (
        <div className="mb-4 rounded-md border-2 border-status-red/40 bg-status-red/10 p-3 alert-critical-pulse">
          <p className="text-sm font-bold text-status-red">
            <Lock className="inline h-4 w-4 mr-1" /> ORDINI BLOCCATI verso questo fornitore
          </p>
          {q.block_reasons && q.block_reasons.length > 0 && (
            <ul className="mt-2 ml-5 list-disc text-xs text-status-red">
              {q.block_reasons.map((r: string, i: number) => <li key={i}>{r}</li>)}
            </ul>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          {/* Score card */}
          <Card className={`leo-card border-2 ${q.qualification_status === "qualified_excellent" || q.qualification_status === "qualified" ? "border-status-green/40" : q.qualification_status === "qualified_with_reserve" ? "border-status-yellow/40" : "border-status-red/40"}`}>
            <CardContent className="p-6 flex items-center justify-between gap-6 flex-wrap">
              <div className="flex items-center gap-4">
                <Truck className="h-12 w-12 text-leo-muted" />
                <div>
                  <div className="text-xs uppercase tracking-wider text-leo-muted">Score qualifica</div>
                  <div className="text-5xl font-bold">{q.score ?? 0}<span className="text-2xl text-leo-muted">/100</span></div>
                  <Badge variant={STATUS_VARIANT[q.qualification_status] ?? "outline"} className="mt-1">{q.qualification_status.replace(/_/g, " ")}</Badge>
                </div>
              </div>
              {q.score_breakdown && (
                <div className="grid grid-cols-2 gap-2 text-center text-xs sm:grid-cols-7">
                  {Object.entries(q.score_breakdown).map(([k, v]) => (
                    <div key={k}>
                      <div className="text-leo-muted capitalize">{k.replace(/_/g, " ")}</div>
                      <div className="font-bold">{v as number}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Editor sezioni */}
          <QualificationEditor qualification={q} />

          {/* Documenti obbligatori */}
          <Card className="leo-card">
            <CardHeader><CardTitle className="text-base">Documenti obbligatori ({(docs ?? []).length})</CardTitle></CardHeader>
            <CardContent className="space-y-1">
              {(docs ?? []).map((d: any) => (
                <div key={d.id} className="flex items-center justify-between rounded-md border border-leo-border bg-leo-card/40 px-3 py-2 text-xs">
                  <div className="flex items-center gap-2">
                    <Badge variant={d.mandatory ? "red" : "outline"} className="text-[10px]">{d.mandatory ? "obblig." : "opz."}</Badge>
                    <span>{d.document_type.replace(/_/g, " ")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {d.expiry_date && <span className="text-leo-muted">scad. {format(new Date(d.expiry_date), "dd/MM/yyyy")}</span>}
                    {d.uploaded ? (
                      <Badge variant={d.verified ? "green" : "yellow"} className="text-[10px]">{d.verified ? "verificato" : "caricato"}</Badge>
                    ) : (
                      <Badge variant="red" className="text-[10px]">MANCANTE</Badge>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {/* Identificativi sync */}
          <Card className="leo-card">
            <CardHeader><CardTitle className="text-base">Identità + Sync ERP</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-xs">
              <Row label="global_id" value={<code>{q.global_id ?? "—"}</code>} />
              <Row label="erp_supplier_id" value={<code>{q.erp_supplier_id ?? "—"}</code>} />
              <Row label="quality_supplier_id" value={<code>{q.id.slice(0, 8)}…</code>} />
              <Row label="source_app" value={<Badge variant="outline">{q.source_app}</Badge>} />
              <Row label="sync_status" value={<Badge variant={q.sync_status === "synced" ? "green" : q.sync_status === "pending" ? "yellow" : "red"}>{q.sync_status}</Badge>} />
              {q.last_synced_at && <Row label="last_synced" value={format(new Date(q.last_synced_at), "dd/MM HH:mm")} />}
              {q.valid_until && <Row label="valid_until" value={format(new Date(q.valid_until), "dd/MM/yyyy")} />}
            </CardContent>
          </Card>

          {/* Outbox events */}
          <Card className="leo-card">
            <CardHeader><CardTitle className="text-base">Outbox ERP (ultimi 10)</CardTitle></CardHeader>
            <CardContent className="space-y-1">
              {(outbox?.length ?? 0) === 0 && <p className="text-xs text-leo-muted">Nessun evento</p>}
              {(outbox ?? []).map((e: any) => (
                <div key={e.id} className="text-xs">
                  <Badge variant={e.status === "sent" ? "green" : e.status === "failed" ? "red" : "yellow"} className="text-[10px] mr-1">{e.status}</Badge>
                  <code>{e.action}</code>
                  <span className="text-leo-muted ml-1">{format(new Date(e.created_at), "dd/MM HH:mm")}</span>
                  {e.last_error && <p className="text-status-red mt-0.5">{e.last_error}</p>}
                </div>
              ))}
            </CardContent>
          </Card>

          <AuditTrailPanel entityType="supplier_qualification" entityId={id} showRevisions />
        </div>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-leo-muted">{label}</span>
      <span>{value}</span>
    </div>
  );
}
