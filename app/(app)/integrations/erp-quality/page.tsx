import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeftRight, AlertOctagon, CheckCircle2, RotateCw, Activity, type LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createServerClient } from "@/lib/supabase/server";

type OutboxRow = {
  id: string;
  action: string;
  status: string | null;
  attempts: number | null;
  last_error: string | null;
  created_at: string;
  sent_at: string | null;
  global_id: string | null;
};

type SyncLogRow = {
  id: string;
  direction: string | null;
  source_app: string | null;
  action: string | null;
  success: boolean | null;
  http_status: number | null;
  error_message: string | null;
  created_at: string;
  global_id: string | null;
};

type ConflictRow = {
  id: string;
  entity_type: string | null;
  field_name: string | null;
  quality_value: unknown;
  erp_value: unknown;
  resolved: boolean | null;
  detected_at: string;
  global_id: string | null;
};

type MappingRow = {
  id: string;
  entity_type: string | null;
  global_id: string | null;
  erp_id: string | null;
  quality_id: string | null;
};

export default async function ErpQualityIntegrationPage() {
  const supabase = await createServerClient();

  const [
    { data: outbox },
    { data: recentLogs },
    { data: conflicts },
    { data: mappings },
  ] = await Promise.all([
    supabase.from("sync_outbox").select("id, action, status, attempts, last_error, created_at, sent_at, global_id").order("created_at", { ascending: false }).limit(30),
    supabase.from("sync_log").select("id, direction, source_app, action, success, http_status, error_message, created_at, global_id").order("created_at", { ascending: false }).limit(30),
    supabase.from("sync_conflict").select("id, entity_type, field_name, quality_value, erp_value, resolved, detected_at, global_id").eq("resolved", false).order("detected_at", { ascending: false }),
    supabase.from("integration_mapping").select("*").order("updated_at", { ascending: false }).limit(20),
  ]);

  const outboxRows = (outbox ?? []) as unknown as OutboxRow[];
  const logRows = (recentLogs ?? []) as unknown as SyncLogRow[];
  const conflictRows = (conflicts ?? []) as unknown as ConflictRow[];
  const mappingRows = (mappings ?? []) as unknown as MappingRow[];
  const pending = outboxRows.filter((o) => o.status === "pending").length;
  const failed = outboxRows.filter((o) => o.status === "failed").length;
  const sentRecent = outboxRows.filter((o) => o.status === "sent").length;

  return (
    <>
      <PageHeader
        title="Integrazione ERP ↔ Quality"
        description="Sync bridge bidirezionale: outbox, log, conflitti, mapping global_id"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild><Link href="/integrations/erp-quality/test">Esegui test suite</Link></Button>
            <Button asChild variant="outline"><Link href="/api/integrations/erp/status" target="_blank">Status JSON</Link></Button>
          </div>
        }
      />

      {/* KPI integrazione */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Outbox pending" value={pending} color="text-status-yellow" icon={Activity} />
        <Kpi label="Outbox failed" value={failed} color="text-status-red" icon={AlertOctagon} />
        <Kpi label="Inviati ok" value={sentRecent} color="text-status-green" icon={CheckCircle2} />
        <Kpi label="Conflitti aperti" value={conflictRows.length} color="text-status-red" icon={ArrowLeftRight} />
      </div>

      {/* Conflitti */}
      {conflictRows.length > 0 && (
        <Card className="leo-card mb-6 border-2 border-status-red/40">
          <CardHeader>
            <CardTitle className="text-base text-status-red flex items-center gap-2">
              <AlertOctagon className="h-4 w-4" /> Conflitti da risolvere ({conflictRows.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {conflictRows.map((c) => (
              <div key={c.id} className="rounded-md border border-status-red/30 bg-status-red/5 p-3 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <Badge variant="red" className="text-[10px]">{c.entity_type}</Badge>
                  <span className="text-leo-muted">{format(new Date(c.detected_at), "dd/MM/yyyy HH:mm")}</span>
                </div>
                <div>Campo: <code>{c.field_name}</code> · global_id: <code className="text-[10px]">{c.global_id?.slice(0, 12)}…</code></div>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  <div className="rounded bg-leo-card/40 p-2">
                    <div className="text-[10px] text-leo-muted">Quality:</div>
                    <code>{JSON.stringify(c.quality_value)}</code>
                  </div>
                  <div className="rounded bg-leo-card/40 p-2">
                    <div className="text-[10px] text-leo-muted">ERP:</div>
                    <code>{JSON.stringify(c.erp_value)}</code>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Outbox */}
        <Card className="leo-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><RotateCw className="h-4 w-4" /> Outbox eventi ({outboxRows.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 max-h-96 overflow-y-auto">
            {outboxRows.map((o) => (
              <div key={o.id} className="rounded-md border border-leo-border bg-leo-card/40 px-3 py-2 text-xs">
                <div className="flex items-center justify-between">
                  <code className="font-mono">{o.action}</code>
                  <Badge variant={o.status === "sent" ? "green" : o.status === "failed" ? "red" : "yellow"} className="text-[10px]">{o.status}</Badge>
                </div>
                <div className="text-leo-muted mt-0.5">
                  global:{o.global_id?.slice(0, 12) ?? "—"} · tentativi {o.attempts ?? 0} · {format(new Date(o.created_at), "dd/MM HH:mm")}
                </div>
                {o.last_error && <div className="text-status-red mt-1">{o.last_error}</div>}
              </div>
            ))}
            {outboxRows.length === 0 && <p className="text-xs text-leo-muted">Nessun evento outbox</p>}
          </CardContent>
        </Card>

        {/* Log */}
        <Card className="leo-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Activity className="h-4 w-4" /> Sync log (ultimi 30)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 max-h-96 overflow-y-auto">
            {logRows.map((l) => (
              <div key={l.id} className="rounded-md border border-leo-border bg-leo-card/40 px-3 py-2 text-xs">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">{l.direction}</Badge>
                  <Badge variant="outline" className="text-[10px]">{l.source_app}</Badge>
                  <code className="font-mono">{l.action}</code>
                  <Badge variant={l.success ? "green" : "red"} className="text-[10px] ml-auto">{l.http_status}</Badge>
                </div>
                <div className="text-leo-muted mt-0.5">{format(new Date(l.created_at), "dd/MM HH:mm:ss")}</div>
                {l.error_message && <div className="text-status-red mt-1">{l.error_message}</div>}
              </div>
            ))}
            {logRows.length === 0 && <p className="text-xs text-leo-muted">Nessun log</p>}
          </CardContent>
        </Card>

        {/* Mapping */}
        <Card className="leo-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Mapping global_id ↔ ERP ↔ Quality ({mappingRows.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {mappingRows.map((m) => (
              <div key={m.id} className="grid grid-cols-4 gap-2 rounded-md border border-leo-border bg-leo-card/40 px-3 py-2 text-xs">
                <span><Badge variant="outline" className="text-[10px]">{m.entity_type}</Badge></span>
                <code className="font-mono text-[10px]">global:{m.global_id?.slice(0, 16)}</code>
                <code className="font-mono text-[10px]">erp:{m.erp_id ?? "—"}</code>
                <code className="font-mono text-[10px]">quality:{m.quality_id?.slice(0, 8) ?? "—"}</code>
              </div>
            ))}
            {mappingRows.length === 0 && <p className="text-xs text-leo-muted">Nessun mapping</p>}
          </CardContent>
        </Card>

        {/* Endpoints documentation */}
        <Card className="leo-card lg:col-span-2 border-leo-border/50">
          <CardHeader><CardTitle className="text-base">Endpoint disponibili</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-xs">
            <Endpoint method="POST" path="/api/integrations/erp/webhook" desc="ERP master data unico: clienti + fornitori. ERP aggiorna anagrafica, Quality protegge score, rating, qualifiche e memoria." />
            <Endpoint method="GET" path="/api/integrations/erp/suppliers/[globalId]/quality-status" desc="ERP query stato qualifica prima di accettare ordine" />
            <Endpoint method="GET" path="/api/integrations/erp/status" desc="Healthcheck integrazione (no auth)" />
            <Endpoint method="POST" path="/api/integrations/erp/push" desc="Worker outbox: invia eventi pending verso ERP (cron/admin)" />
            <div className="rounded-md border border-brand-cyan/30 bg-brand-cyan/5 p-3">
              <div className="font-semibold text-brand-cyan">Regola master data</div>
              <p className="mt-1 text-leo-muted">
                ERP è la sorgente anagrafica per clienti e fornitori. Quality mantiene campi qualità separati:
                qualifica fornitore, score, blocchi ordine, Customer Experience Score, warning, review e note strategiche.
              </p>
              <code className="mt-2 block text-[11px]">
                customer.updated: global_id, erp_customer_id, fields.name, fields.previous_name
              </code>
              <code className="mt-1 block text-[11px]">
                supplier.updated: global_id, erp_supplier_id, fields.legal_name, fields.email, fields.phone
              </code>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function Kpi({ label, value, color, icon: Icon }: { label: string; value: number; color: string; icon: LucideIcon }) {
  return (
    <Card className="leo-card">
      <CardContent className="p-4 text-center">
        <Icon className={`mx-auto mb-1 h-5 w-5 ${color}`} />
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-xs text-leo-muted">{label}</div>
      </CardContent>
    </Card>
  );
}

function Endpoint({ method, path, desc }: { method: string; path: string; desc: string }) {
  return (
    <div className="rounded-md border border-leo-border p-2">
      <div className="flex items-center gap-2">
        <Badge variant={method === "GET" ? "blue" : "green"} className="text-[10px]">{method}</Badge>
        <code className="text-xs">{path}</code>
      </div>
      <p className="text-leo-muted mt-1">{desc}</p>
    </div>
  );
}
