import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { ListChecks, AlertTriangle, Lock } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createServerClient } from "@/lib/supabase/server";

export default async function SubmissionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerClient();
  const { data: s } = await supabase
    .from("form_submission")
    .select("*, template:template_id(code, title, category, genera_task, genera_nc, blocco_operativo, schema), company:company_id(name), submitted_by:submitted_by(first_name,last_name), generated_task:generated_task_id(id, title, due_date, status), generated_nc:generated_nc_id(id, code, title, severity, status)")
    .eq("id", id)
    .maybeSingle();
  if (!s) notFound();

  const fields = ((s as any).template?.schema?.fields ?? []) as Array<{ key: string; label: string; type: string }>;
  const values = (s.values ?? {}) as Record<string, any>;

  return (
    <>
      <PageHeader
        title={s.title || (s as any).template?.title}
        description={`${(s as any).template?.code} · compilato il ${format(new Date(s.created_at), "dd/MM/yyyy HH:mm")} da ${(s as any).submitted_by ? `${(s as any).submitted_by.first_name} ${(s as any).submitted_by.last_name}` : "—"}`}
        actions={
          <Button asChild variant="outline">
            <Link href="/forms/submissions">← Tutte le compilazioni</Link>
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card className="leo-card">
            <CardHeader>
              <CardTitle>Valori compilati</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-2">
                {fields.map((f) => {
                  const v = values[f.key];
                  const display = v === undefined || v === null || v === ""
                    ? <span className="text-leo-muted">—</span>
                    : f.type === "checkbox" ? (v ? "✓" : "✗") : String(v);
                  return (
                    <div key={f.key} className={f.type === "textarea" ? "md:col-span-2" : ""}>
                      <dt className="text-xs font-medium uppercase tracking-wider text-leo-muted">{f.label}</dt>
                      <dd className="mt-0.5 text-sm">{display}</dd>
                    </div>
                  );
                })}
              </dl>
              {s.notes && (
                <div className="mt-4 border-t border-leo-border pt-3">
                  <div className="text-xs font-medium uppercase tracking-wider text-leo-muted">Note</div>
                  <p className="mt-1 text-sm">{s.notes}</p>
                </div>
              )}
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
                <span>Stato compilazione</span>
                <Badge variant="outline">{s.status}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Impresa</span>
                <span>{(s as any).company?.name}</span>
              </div>
              {s.is_operational_block && (
                <div className="rounded-md border border-status-red/40 bg-status-red/10 p-2">
                  <span className="flex items-center gap-2 text-status-red"><Lock className="h-3 w-3" /> Blocco operativo attivo</span>
                </div>
              )}
            </CardContent>
          </Card>

          {(s as any).generated_task && (
            <Card className="leo-card border-status-blue/40">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ListChecks className="h-4 w-4 text-status-blue" /> Task generato
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="font-medium">{(s as any).generated_task.title}</div>
                <div className="text-xs text-leo-muted">
                  Scadenza: {format(new Date((s as any).generated_task.due_date), "dd/MM/yyyy")}
                </div>
                <Badge variant="outline">{(s as any).generated_task.status}</Badge>
                <Link href={`/deadlines`} className="block text-xs text-brand-cyan hover:underline">
                  Vai alle scadenze →
                </Link>
              </CardContent>
            </Card>
          )}

          {(s as any).generated_nc && (
            <Card className="leo-card border-status-orange/40">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-status-orange" /> NC generata
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="font-medium">{(s as any).generated_nc.title}</div>
                <div className="flex gap-2">
                  <Badge variant="outline">{(s as any).generated_nc.severity}</Badge>
                  <Badge variant="outline">{(s as any).generated_nc.status}</Badge>
                </div>
                <Link href={`/non-conformities/${(s as any).generated_nc.id}`} className="block text-xs text-brand-cyan hover:underline">
                  Apri NC →
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
