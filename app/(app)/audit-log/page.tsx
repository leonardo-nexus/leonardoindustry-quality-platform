import Link from "next/link";
import { format } from "date-fns";
import { History, Filter, Edit3, Plus, Trash2, GitBranch, Lock, Unlock, FileSignature, CheckCircle2, XCircle, Upload, Download, RotateCcw, Archive } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createServerClient } from "@/lib/supabase/server";
import { getCurrentLocale } from "@/lib/i18n/dictionary";

const ACTION_META: Record<string, { Icon: any; color: string }> = {
  create: { Icon: Plus, color: "text-status-green" },
  update: { Icon: Edit3, color: "text-brand-cyan" },
  delete: { Icon: Trash2, color: "text-status-red" },
  restore: { Icon: RotateCcw, color: "text-status-green" },
  approve: { Icon: CheckCircle2, color: "text-status-green" },
  reject: { Icon: XCircle, color: "text-status-red" },
  archive: { Icon: Archive, color: "text-status-orange" },
  revise: { Icon: GitBranch, color: "text-brand-cyan" },
  complete: { Icon: CheckCircle2, color: "text-status-green" },
  block: { Icon: Lock, color: "text-status-red" },
  unblock: { Icon: Unlock, color: "text-status-green" },
  sign: { Icon: FileSignature, color: "text-brand-cyan" },
  upload: { Icon: Upload, color: "text-status-green" },
  download: { Icon: Download, color: "text-leo-muted" },
  import: { Icon: Upload, color: "text-status-green" },
  export: { Icon: Download, color: "text-leo-muted" },
  escalate: { Icon: Lock, color: "text-status-orange" },
  dismiss: { Icon: XCircle, color: "text-leo-muted" },
  snooze: { Icon: RotateCcw, color: "text-status-yellow" },
  assign: { Icon: Plus, color: "text-brand-cyan" },
};

const ACTIONS = Object.keys(ACTION_META);
const ENTITY_TYPES = [
  "person", "company", "project", "document", "non_conformity", "quality_checklist",
  "quality_plan", "material_request", "material_order", "material_reception", "material_nc",
  "supplier_authorization", "supplier_deroga", "contract", "contract_clause",
  "technical_sheet", "material_lot",
];

export default async function AuditLogPage({ searchParams }: { searchParams: Promise<{ entity?: string; action?: string; user?: string; from?: string; to?: string }> }) {
  const sp = await searchParams;
  const locale = await getCurrentLocale();
  const supabase = await createServerClient();

  let q: any = supabase
    .from("audit_log")
    .select("*, person:person_id(first_name, last_name)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (sp.entity) q = q.eq("entity_type", sp.entity);
  if (sp.action) q = q.eq("action", sp.action);
  if (sp.user) q = q.ilike("user_full_name", `%${sp.user}%`);
  if (sp.from) q = q.gte("created_at", sp.from);
  if (sp.to) q = q.lte("created_at", sp.to + "T23:59:59");

  const { data: logs, count } = await q;

  const activeFilters = [sp.entity, sp.action, sp.user, sp.from, sp.to].filter(Boolean).length;

  return (
    <>
      <PageHeader
        title={locale === "es" ? "Registro de auditoría" : "Registro audit log"}
        description={locale === "es"
          ? `${logs?.length ?? 0} eventos · cambios firmati automáticamente con identidad del usuario`
          : `${logs?.length ?? 0} eventi · modifiche firmate automaticamente con identità utente`}
      />

      <Card className="leo-card mb-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4" /> {locale === "es" ? "Filtros" : "Filtri"} {activeFilters > 0 && <Badge variant="outline">{activeFilters} attivi</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-2 sm:grid-cols-5">
            <label className="block text-xs">
              <span className="block text-leo-muted mb-1">{locale === "es" ? "Entidad" : "Entità"}</span>
              <select name="entity" defaultValue={sp.entity ?? ""} className="w-full rounded-md border border-leo-border bg-leo-card px-2 py-1.5 text-sm">
                <option value="">— tutte —</option>
                {ENTITY_TYPES.map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
            </label>
            <label className="block text-xs">
              <span className="block text-leo-muted mb-1">{locale === "es" ? "Acción" : "Azione"}</span>
              <select name="action" defaultValue={sp.action ?? ""} className="w-full rounded-md border border-leo-border bg-leo-card px-2 py-1.5 text-sm">
                <option value="">— tutte —</option>
                {ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </label>
            <label className="block text-xs">
              <span className="block text-leo-muted mb-1">{locale === "es" ? "Usuario" : "Utente"}</span>
              <Input name="user" defaultValue={sp.user ?? ""} placeholder={locale === "es" ? "nombre" : "nome"} />
            </label>
            <label className="block text-xs">
              <span className="block text-leo-muted mb-1">{locale === "es" ? "Desde" : "Da"}</span>
              <Input type="date" name="from" defaultValue={sp.from ?? ""} />
            </label>
            <label className="block text-xs">
              <span className="block text-leo-muted mb-1">{locale === "es" ? "Hasta" : "A"}</span>
              <Input type="date" name="to" defaultValue={sp.to ?? ""} />
            </label>
            <div className="sm:col-span-5 flex gap-2">
              <Button type="submit" size="sm">{locale === "es" ? "Filtrar" : "Filtra"}</Button>
              <Button asChild type="button" size="sm" variant="ghost"><Link href="/audit-log">{locale === "es" ? "Reset" : "Reset"}</Link></Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="leo-card">
        <CardContent className="p-0">
          <div className="divide-y divide-leo-border max-h-[70vh] overflow-y-auto">
            {(logs ?? []).map((l: any) => {
              const meta = ACTION_META[l.action] ?? ACTION_META.update;
              const Icon = meta.Icon;
              return (
                <div key={l.id} className="flex items-start gap-3 p-3 text-xs">
                  <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${meta.color}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">{l.action}</Badge>
                      <span className="font-mono text-[10px] text-leo-muted">{l.entity_type}</span>
                      <span className="font-mono text-[10px] text-leo-muted">{l.entity_id.slice(0, 8)}…</span>
                      {l.revision_number && <Badge variant="outline" className="text-[9px]">rev {l.revision_number}</Badge>}
                      <span className="text-[10px] uppercase text-leo-muted">{l.source}</span>
                      <span className="ml-auto text-leo-muted">{format(new Date(l.created_at), "dd/MM/yyyy HH:mm")}</span>
                    </div>
                    <div className="text-leo-muted mt-0.5">
                      <strong>{l.user_full_name ?? l.user_email ?? "—"}</strong>
                      {l.changed_fields && l.changed_fields.length > 0 && (
                        <> · campi: <code className="text-[10px]">{l.changed_fields.join(", ")}</code></>
                      )}
                    </div>
                    {l.reason && <div className="mt-1 italic text-leo-muted">"{l.reason}"</div>}
                  </div>
                </div>
              );
            })}
            {(logs?.length ?? 0) === 0 && (
              <div className="p-8 text-center text-sm text-leo-muted">
                <History className="mx-auto mb-2 h-6 w-6" /> {locale === "es" ? "Sin eventos para estos filtros" : "Nessun evento per questi filtri"}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
