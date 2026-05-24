import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { ClipboardCheck, AlertTriangle, Lock, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createServerClient } from "@/lib/supabase/server";
import { AuditTrailPanel } from "@/components/audit/audit-trail-panel";
import { ChecklistItemControl, CompleteButton, SignButton } from "./controls";

export default async function ChecklistDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerClient();
  const { data: chk } = await supabase
    .from("quality_checklist")
    .select("*, responsible:responsible_id(first_name,last_name), phase:plan_phase_id(name, plan:plan_id(project:project_id(id, code, name, company:company_id(name))))")
    .eq("id", id)
    .maybeSingle();
  if (!chk) notFound();

  const { data: items } = await supabase
    .from("quality_checklist_item")
    .select("*, compiled_by:compiled_by(first_name,last_name)")
    .eq("checklist_id", id)
    .order("ordering");

  const totalItems = items?.length ?? 0;
  const completedItems = (items ?? []).filter((i: any) => i.result !== "non_compilato").length;
  const requiredMissing = (items ?? []).filter((i: any) => i.required && i.result === "non_compilato").length;
  const attachMissing = (items ?? []).filter((i: any) => i.attachment_required && !i.attachment_file_id).length;
  const criticalNc = (items ?? []).filter((i: any) => i.is_critical && i.result === "non_conforme").length;

  const canComplete = chk.status !== "completata" && requiredMissing === 0 && attachMissing === 0 && (!chk.signature_required || chk.signed_by);

  return (
    <>
      <PageHeader
        title={`${chk.code} · ${chk.title}`}
        description={`${(chk as any).phase?.plan?.project?.code} · ${(chk as any).phase?.name} · ${(chk as any).phase?.plan?.project?.company?.name}`}
        actions={
          <Button asChild variant="outline">
            <Link href="/quality-sentinel/checklists">← Checklist</Link>
          </Button>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="leo-card">
            <CardHeader>
              <CardTitle className="text-base">Item da compilare</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(items ?? []).map((item: any) => (
                <ChecklistItemControl key={item.id} item={item} checklistId={id} />
              ))}
              {totalItems === 0 && <p className="text-sm text-leo-muted">Nessun item in questa checklist.</p>}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="leo-card">
            <CardHeader>
              <CardTitle className="text-base">Stato</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span>Stato attuale</span>
                <Badge variant="outline">{chk.status.replace(/_/g, " ")}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Item completati</span>
                <span>{completedItems}/{totalItems}</span>
              </div>
              {requiredMissing > 0 && (
                <div className="rounded-md border border-status-orange/40 bg-status-orange/10 p-2 text-xs text-status-orange">
                  <AlertTriangle className="inline h-3 w-3 mr-1" /> {requiredMissing} item obbligatori mancanti
                </div>
              )}
              {attachMissing > 0 && (
                <div className="rounded-md border border-status-red/40 bg-status-red/10 p-2 text-xs text-status-red">
                  <Lock className="inline h-3 w-3 mr-1" /> {attachMissing} allegati obbligatori mancanti
                </div>
              )}
              {criticalNc > 0 && (
                <div className="rounded-md border border-status-red/40 bg-status-red/10 p-2 text-xs text-status-red">
                  <AlertTriangle className="inline h-3 w-3 mr-1" /> {criticalNc} item critici NON CONFORME (genera NC automatica)
                </div>
              )}
              {chk.signature_required && (
                <div className="flex items-center justify-between">
                  <span>Firma richiesta</span>
                  {chk.signed_by ? <Badge variant="green">Firmata</Badge> : <Badge variant="red">Mancante</Badge>}
                </div>
              )}
              {chk.due_date && (
                <div className="flex items-center justify-between">
                  <span>Scadenza</span>
                  <span className="text-xs">{format(new Date(chk.due_date), "dd/MM/yyyy")}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="leo-card">
            <CardHeader>
              <CardTitle className="text-base">Azioni</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {chk.signature_required && !chk.signed_by && chk.status !== "completata" && (
                <SignButton checklistId={id} />
              )}
              <CompleteButton checklistId={id} canComplete={canComplete} alreadyDone={chk.status === "completata"} />
              {chk.status === "completata" && (
                <p className="flex items-center gap-2 text-xs text-status-green">
                  <CheckCircle2 className="h-3 w-3" /> Completata il {chk.completed_at ? format(new Date(chk.completed_at), "dd/MM HH:mm") : "—"}
                </p>
              )}
            </CardContent>
          </Card>

          <AuditTrailPanel entityType="quality_checklist" entityId={id} showRevisions />
        </div>
      </div>
    </>
  );
}
