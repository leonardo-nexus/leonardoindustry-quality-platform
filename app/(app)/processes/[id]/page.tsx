import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import {
  Workflow, FileText, ClipboardList, AlertTriangle, ClipboardCheck,
  CalendarClock, ListChecks, BookCheck, Lock, ArrowRight,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createServerClient } from "@/lib/supabase/server";
import { LinkRequirementForm } from "./link-requirement-form";

export default async function ProcessDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerClient();
  const { data: process } = await supabase.from("process").select("*").eq("id", id).maybeSingle();
  if (!process) notFound();

  const op = (process.operational_data ?? {}) as {
    procedures?: string[]; norms?: string[]; automations?: string[]; forms?: string[];
  };

  const [
    { data: requirements },
    { data: allRequirements },
    { data: procedureDocs },
    { data: formTemplates },
    { data: openTasks },
    { data: openNc },
    { data: plannedAudits },
    { data: instructions },
  ] = await Promise.all([
    supabase.from("process_requirement")
      .select("id, applicability, notes, requirement:standard_requirement(id, clause, title, standard:standard_id(code,version))")
      .eq("process_id", id),
    supabase.from("standard_requirement")
      .select("id, clause, title, standard:standard_id(code)")
      .order("clause"),
    supabase.from("document")
      .select("id, code, title, status, company:company_id(name)")
      .eq("process_id", id)
      .eq("type", "procedura"),
    supabase.from("form_template")
      .select("id, code, title, category, genera_task, genera_nc, blocco_operativo, frequenza")
      .eq("process_id", id)
      .eq("active", true)
      .order("code"),
    supabase.from("task")
      .select("id, title, due_date, status, priority, company:company_id(name)")
      .eq("process_id", id)
      .in("status", ["aperta", "in_corso", "scaduta"])
      .order("due_date").limit(10),
    supabase.from("non_conformity")
      .select("id, title, severity, status, detected_at, company:company_id(name)")
      .eq("process_id", id)
      .neq("status", "chiusa")
      .order("detected_at", { ascending: false }).limit(10),
    supabase.from("audit")
      .select("id, code, audit_type, planned_date, status, company:company_id(name)")
      .eq("process_id", id)
      .order("planned_date", { ascending: false }).limit(10),
    supabase.from("process_instruction")
      .select("*")
      .eq("process_id", id)
      .eq("active", true)
      .order("ordering"),
  ]);

  return (
    <>
      <PageHeader
        title={process.name}
        description={`${process.code} · categoria ${process.category}${process.description ? ` · ${process.description}` : ""}`}
      />

      {/* === Riepilogo operativo === */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="leo-card">
          <CardContent className="p-4 text-center">
            <FileText className="mx-auto mb-2 h-5 w-5 text-brand-cyan" />
            <div className="text-2xl font-bold">{procedureDocs?.length ?? 0}</div>
            <div className="text-xs text-leo-muted">Procedure attive</div>
          </CardContent>
        </Card>
        <Card className="leo-card">
          <CardContent className="p-4 text-center">
            <ClipboardList className="mx-auto mb-2 h-5 w-5 text-brand-green" />
            <div className="text-2xl font-bold">{formTemplates?.length ?? 0}</div>
            <div className="text-xs text-leo-muted">Format collegati</div>
          </CardContent>
        </Card>
        <Card className="leo-card">
          <CardContent className="p-4 text-center">
            <BookCheck className="mx-auto mb-2 h-5 w-5 text-brand-blue" />
            <div className="text-2xl font-bold">{requirements?.length ?? 0}</div>
            <div className="text-xs text-leo-muted">Requisiti norma</div>
          </CardContent>
        </Card>
        <Card className="leo-card">
          <CardContent className="p-4 text-center">
            <AlertTriangle className="mx-auto mb-2 h-5 w-5 text-status-orange" />
            <div className="text-2xl font-bold">{openNc?.length ?? 0}</div>
            <div className="text-xs text-leo-muted">NC aperte</div>
          </CardContent>
        </Card>
      </div>

      {/* === Operational data + Automazioni === */}
      {(op.norms?.length || op.automations?.length) && (
        <Card className="leo-card mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Workflow className="h-4 w-4 text-brand-cyan" /> Riferimenti normativi e automazioni
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {op.norms && op.norms.length > 0 && (
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-leo-muted mb-1">Norme di riferimento</div>
                <div className="flex flex-wrap gap-1">
                  {op.norms.map((n) => <Badge key={n} variant="blue">{n}</Badge>)}
                </div>
              </div>
            )}
            {op.automations && op.automations.length > 0 && (
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-leo-muted mb-1">Automazioni attive</div>
                <ul className="space-y-1">
                  {op.automations.map((a, i) => (
                    <li key={i} className="flex items-start gap-2"><Lock className="h-3 w-3 mt-0.5 text-brand-green shrink-0" /> {a}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* === Procedure + Format === */}
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="leo-card">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2"><FileText className="h-4 w-4 text-brand-cyan" /> Procedure collegate</span>
              <Link href="/documents" className="text-xs text-brand-cyan hover:underline">Tutte →</Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {(procedureDocs ?? []).map((d: any) => (
              <Link key={d.id} href={`/documents/${d.id}`} className="flex items-center justify-between rounded-md bg-leo-card/40 px-3 py-2 text-sm hover:bg-leo-card">
                <span>
                  <span className="font-mono text-xs text-brand-cyan">{d.code}</span>
                  <span className="ml-2">{d.title}</span>
                </span>
                <Badge variant={d.status === "attivo" ? "green" : "gray"} className="text-[10px]">{d.status}</Badge>
              </Link>
            ))}
            {(procedureDocs?.length ?? 0) === 0 && (
              <p className="text-xs text-leo-muted py-2">Nessuna procedura collegata</p>
            )}
          </CardContent>
        </Card>

        <Card className="leo-card">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2"><ClipboardList className="h-4 w-4 text-brand-green" /> Format compilabili</span>
              <Link href={`/forms?category=${process.category}`} className="text-xs text-brand-cyan hover:underline">Catalogo →</Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {(formTemplates ?? []).map((t: any) => (
              <Link key={t.id} href={`/forms/${t.code}`} className="flex items-center justify-between rounded-md bg-leo-card/40 px-3 py-2 text-sm hover:bg-leo-card">
                <span>
                  <span className="font-mono text-xs text-brand-cyan">{t.code}</span>
                  <span className="ml-2">{t.title}</span>
                </span>
                <div className="flex gap-0.5">
                  {t.genera_task && <ListChecks className="h-3 w-3 text-status-blue" />}
                  {t.genera_nc && <AlertTriangle className="h-3 w-3 text-status-orange" />}
                  {t.blocco_operativo && <Lock className="h-3 w-3 text-status-red" />}
                </div>
              </Link>
            ))}
            {(formTemplates?.length ?? 0) === 0 && (
              <p className="text-xs text-leo-muted py-2">Nessun format collegato</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* === Istruzioni operative === */}
      {(instructions?.length ?? 0) > 0 && (
        <Card className="leo-card mb-6">
          <CardHeader>
            <CardTitle className="text-base">Istruzioni operative</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(instructions ?? []).map((i: any) => (
              <div key={i.id} className="rounded-md border border-leo-border bg-leo-card/40 p-3">
                <div className="mb-1 font-medium text-sm">{i.title}</div>
                <p className="text-xs text-leo-muted">{i.what_text}</p>
                <div className="mt-2 grid grid-cols-1 gap-1 text-xs sm:grid-cols-2">
                  {i.when_text && <div><span className="text-leo-muted">Quando:</span> {i.when_text}</div>}
                  {i.who_text && <div><span className="text-leo-muted">Chi:</span> {i.who_text}</div>}
                </div>
                {(i.forms_codes?.length ?? 0) > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {i.forms_codes.map((c: string) => (
                      <Link key={c} href={`/forms/${c}`}>
                        <Badge variant="outline" className="text-[10px] hover:bg-brand-cyan/20">{c}</Badge>
                      </Link>
                    ))}
                  </div>
                )}
                {i.alarms_generated && (
                  <p className="mt-2 text-xs text-status-orange">⚡ {i.alarms_generated}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* === Task / NC / Audit === */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 mb-6">
        <Card className="leo-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="h-4 w-4 text-status-blue" /> Task aperti
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {(openTasks ?? []).map((t: any) => (
              <div key={t.id} className="rounded-md bg-leo-card/40 px-3 py-2 text-xs">
                <div className="font-medium">{t.title}</div>
                <div className="text-leo-muted">
                  {format(new Date(t.due_date), "dd/MM/yy")} · {t.company?.name}
                </div>
              </div>
            ))}
            {(openTasks?.length ?? 0) === 0 && <p className="text-xs text-leo-muted py-2">Nessun task aperto</p>}
          </CardContent>
        </Card>

        <Card className="leo-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-status-orange" /> NC aperte
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {(openNc ?? []).map((nc: any) => (
              <Link key={nc.id} href={`/non-conformities/${nc.id}`} className="block rounded-md bg-leo-card/40 px-3 py-2 text-xs hover:bg-leo-card">
                <div className="font-medium">{nc.title}</div>
                <div className="flex justify-between text-leo-muted">
                  <span>{format(new Date(nc.detected_at), "dd/MM/yy")}</span>
                  <Badge variant="outline" className="text-[10px]">{nc.severity}</Badge>
                </div>
              </Link>
            ))}
            {(openNc?.length ?? 0) === 0 && <p className="text-xs text-leo-muted py-2">Nessuna NC aperta</p>}
          </CardContent>
        </Card>

        <Card className="leo-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardCheck className="h-4 w-4 text-brand-cyan" /> Audit
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {(plannedAudits ?? []).map((a: any) => (
              <Link key={a.id} href={`/audits/${a.id}`} className="block rounded-md bg-leo-card/40 px-3 py-2 text-xs hover:bg-leo-card">
                <div className="font-medium">{a.code ?? a.audit_type.toUpperCase()}</div>
                <div className="flex justify-between text-leo-muted">
                  <span>{format(new Date(a.planned_date), "dd/MM/yy")}</span>
                  <Badge variant="outline" className="text-[10px]">{a.status}</Badge>
                </div>
              </Link>
            ))}
            {(plannedAudits?.length ?? 0) === 0 && <p className="text-xs text-leo-muted py-2">Nessun audit pianificato</p>}
          </CardContent>
        </Card>
      </div>

      {/* === Requisiti norma === */}
      <Card className="leo-card">
        <CardHeader>
          <CardTitle className="text-base">Requisiti normativi coperti</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Norma</TableHead>
                    <TableHead>Clausola</TableHead>
                    <TableHead>Titolo</TableHead>
                    <TableHead>Applicabilità</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(requirements ?? []).map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs">{r.requirement?.standard?.code}</TableCell>
                      <TableCell className="font-mono text-xs">{r.requirement?.clause}</TableCell>
                      <TableCell>{r.requirement?.title}</TableCell>
                      <TableCell>
                        <Badge variant={r.applicability === "applicabile" ? "green" : r.applicability === "parziale" ? "yellow" : "gray"}>
                          {r.applicability}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(requirements?.length ?? 0) === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-xs text-leo-muted py-6">
                        Nessun requisito collegato — aggiungi dal pannello a destra
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <div>
              <LinkRequirementForm processId={id} requirements={allRequirements ?? []} />
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
