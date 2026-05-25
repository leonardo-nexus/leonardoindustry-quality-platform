import { notFound } from "next/navigation";
import Link from "next/link";
import type { ReactNode } from "react";
import { format } from "date-fns";
import { ArrowLeft, Database, Lock, Plus, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createServerClient } from "@/lib/supabase/server";
import { AuditTrailPanel } from "@/components/audit/audit-trail-panel";
import { getEntityHistory } from "@/lib/audit/audit-log";
import { DOCUMENT_QUALIFICATION_REQUIREMENTS } from "@/lib/quality/supplier-qualification-scoring";
import { QualificationEditor } from "./editor";
import { SupplierQualificationDashboard } from "./dashboard";
import { DocumentQualificationChecklist } from "./document-checklist";

type QualificationDetailRow = {
  id: string;
  supplier_name: string;
  legal_name: string;
  country: string | null;
  company?: { name: string | null } | null;
  blocked_for_orders: boolean | null;
  block_reasons: string[] | null;
  global_id: string | null;
  erp_supplier_id: string | null;
  source_app: string | null;
  sync_status: string | null;
  last_synced_at: string | null;
  valid_until: string | null;
};

type OutboxEvent = {
  id: string;
  action: string;
  status: string;
  last_error: string | null;
  created_at: string;
};

type QualificationDocumentRow = {
  id: string;
  document_type: string;
  mandatory: boolean | null;
  uploaded: boolean | null;
  verified: boolean | null;
  expiry_date: string | null;
};

export default async function QualificationDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ source?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const supabase = await createServerClient();

  const { data: q } = await supabase
    .from("supplier_qualification")
    .select("*, company:company_id(name), approver:approved_by(first_name, last_name), reviewer:reviewed_by(first_name, last_name)")
    .eq("id", id)
    .maybeSingle();
  if (!q) notFound();
  const qualification = q as unknown as QualificationDetailRow;

  const [docsResult, outboxResult, suppliersResult, history] = await Promise.all([
    supabase
      .from("qualification_document")
      .select("*")
      .eq("qualification_id", id)
      .order("document_type"),
    supabase
      .from("sync_outbox")
      .select("id, action, status, attempts, last_error, created_at, sent_at")
      .eq("entity_type", "supplier_qualification")
      .eq("entity_id", id)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("supplier_qualification")
      .select("id, legal_name, supplier_name, score, qualification_status")
      .is("deleted_at", null)
      .order("legal_name"),
    getEntityHistory("supplier_qualification", id, 20),
  ]);

  const docs = (docsResult.data ?? []) as unknown as QualificationDocumentRow[];
  const displayDocs = DOCUMENT_QUALIFICATION_REQUIREMENTS.map((requirement) => {
    const current = docs.find((document) => document.document_type === requirement.document_type);
    return current ?? {
      id: `new:${requirement.document_type}`,
      document_type: requirement.document_type,
      mandatory: requirement.mandatory,
      uploaded: false,
      verified: false,
      expiry_date: null,
    };
  });
  const outbox = (outboxResult.data ?? []) as unknown as OutboxEvent[];
  const suppliers = suppliersResult.data ?? [];
  const isFromErp = sp.source === "erp";

  return (
    <>
      <PageHeader
        title="Cruscotto di Qualifica Fornitore"
        description={`${qualification.legal_name} - ${qualification.supplier_name} - ${qualification.country ?? "Paese non indicato"} - ${qualification.company?.name ?? "Gruppo"}`}
        actions={
          <div className="flex flex-wrap gap-2">
            {isFromErp && (
              <>
                <Badge variant="outline" className="border-brand-cyan/40 bg-brand-blue/10 text-brand-cyan">
                  Aperto da ERP
                </Badge>
                <Button asChild variant="outline" size="sm">
                  <a href={process.env.ERP_RETURN_URL ?? "/"}>Torna a ERP</a>
                </Button>
              </>
            )}
            <Button asChild>
              <Link href="/suppliers/qualification/new">
                <Plus className="h-4 w-4" />
                Aggiungi fornitore
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/suppliers/qualification">
                <ArrowLeft className="h-4 w-4" />
                Lista qualifiche
              </Link>
            </Button>
          </div>
        }
      />

      {qualification.blocked_for_orders && (
        <div className="mb-4 rounded-md border-2 border-status-red/40 bg-status-red/10 p-3 alert-critical-pulse">
          <p className="text-sm font-bold text-status-red">
            <Lock className="mr-1 inline h-4 w-4" /> ORDINI BLOCCATI verso questo fornitore
          </p>
          {qualification.block_reasons && qualification.block_reasons.length > 0 && (
            <ul className="mt-2 ml-5 list-disc text-xs text-status-red">
              {qualification.block_reasons.map((reason, index) => <li key={index}>{reason}</li>)}
            </ul>
          )}
        </div>
      )}

      <SupplierQualificationDashboard
        qualification={q}
        documents={displayDocs}
        suppliers={suppliers}
        history={history}
      />

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <DocumentQualificationChecklist qualificationId={id} documents={displayDocs} />
          <QualificationEditor qualification={q} />
          <AuditTrailPanel entityType="supplier_qualification" entityId={id} showRevisions />
        </div>

        <div className="space-y-4">
          <Card className="leo-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Database className="h-4 w-4 text-brand-cyan" />
                Identita e sync ERP
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <Row label="global_id" value={<code>{qualification.global_id ?? "-"}</code>} />
              <Row label="erp_supplier_id" value={<code>{qualification.erp_supplier_id ?? "-"}</code>} />
              <Row label="quality_supplier_id" value={<code>{qualification.id.slice(0, 8)}...</code>} />
              <Row label="source_app" value={<Badge variant="outline">{qualification.source_app}</Badge>} />
              <Row label="sync_status" value={<Badge variant={qualification.sync_status === "synced" ? "green" : qualification.sync_status === "pending" ? "yellow" : "red"}>{qualification.sync_status}</Badge>} />
              {qualification.last_synced_at && <Row label="last_synced" value={format(new Date(qualification.last_synced_at), "dd/MM HH:mm")} />}
              {qualification.valid_until && <Row label="valid_until" value={format(new Date(qualification.valid_until), "dd/MM/yyyy")} />}
            </CardContent>
          </Card>

          <Card className="leo-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <RefreshCw className="h-4 w-4 text-brand-cyan" />
                Outbox ERP
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {outbox.length === 0 && <p className="text-xs text-leo-muted">Nessun evento</p>}
              {outbox.map((event) => (
                <div key={event.id} className="rounded-md border border-leo-border/70 p-2 text-xs">
                  <div className="flex items-center gap-2">
                    <Badge variant={event.status === "sent" ? "green" : event.status === "failed" ? "red" : "yellow"} className="text-[10px]">
                      {event.status}
                    </Badge>
                    <code className="text-[11px]">{event.action}</code>
                  </div>
                  <div className="mt-1 text-leo-muted">{format(new Date(event.created_at), "dd/MM HH:mm")}</div>
                  {event.last_error && <p className="mt-1 text-status-red">{event.last_error}</p>}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-2 border-b border-leo-border/60 py-1.5">
      <span className="text-leo-muted">{label}</span>
      <span>{value}</span>
    </div>
  );
}
