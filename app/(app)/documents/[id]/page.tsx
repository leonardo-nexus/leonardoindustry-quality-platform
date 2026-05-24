import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { ClipboardList, BookCheck, ListChecks, AlertTriangle, Lock } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createServerClient } from "@/lib/supabase/server";
import { RevisionForm } from "./revision-form";
import { DownloadButton } from "./download-button";
import { DeadlineBadge } from "@/components/status/deadline-badge";
import { AuditTrailPanel } from "@/components/audit/audit-trail-panel";
import { DocumentEditPanel } from "./document-edit-panel";

export default async function DocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerClient();

  const { data: doc } = await supabase
    .from("document")
    .select("*, company:company_id(name), process:process_id(id, name, code)")
    .eq("id", id)
    .maybeSingle();
  if (!doc) notFound();

  const [{ data: revisions }, { data: linkedFormats }, { data: instructions }] = await Promise.all([
    supabase.from("document_revision")
      .select("id, revision, issue_date, next_review_date, is_current, file_id, file:file_id(file_name, size_bytes)")
      .eq("document_id", id)
      .order("issue_date", { ascending: false }),
    supabase.from("procedure_format_link")
      .select("ordering, form:form_template_id(id, code, title, category, genera_task, genera_nc, blocco_operativo, frequenza)")
      .eq("document_id", id)
      .order("ordering"),
    doc.code
      ? supabase.from("process_instruction")
          .select("*")
          .eq("procedure_code_ref", doc.code)
          .eq("active", true)
      : Promise.resolve({ data: [] }),
  ]);

  return (
    <>
      <PageHeader
        title={`${doc.code} · ${doc.title}`}
        description={`${doc.type} · ${(doc as any).company?.name ?? "Gruppo"} · processo ${(doc as any).process?.name ?? "—"}`}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Colonna sx: revisioni + istruzioni operative */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="leo-card">
            <CardHeader>
              <CardTitle>Revisioni</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Revisione</TableHead>
                    <TableHead>Emissione</TableHead>
                    <TableHead>Prossima revisione</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead>File</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(revisions ?? []).map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono">{r.revision}</TableCell>
                      <TableCell className="text-xs">{r.issue_date ? format(new Date(r.issue_date), "dd/MM/yyyy") : "—"}</TableCell>
                      <TableCell>
                        {r.next_review_date ? <DeadlineBadge dueDate={r.next_review_date} /> : "—"}
                      </TableCell>
                      <TableCell>
                        {r.is_current ? <Badge variant="green">Corrente</Badge> : <Badge variant="gray">Storica</Badge>}
                      </TableCell>
                      <TableCell>
                        {r.file_id ? (
                          <DownloadButton fileId={r.file_id} fileName={r.file?.file_name ?? "file"} />
                        ) : (
                          <span className="text-xs text-leo-muted">Nessuno</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(revisions?.length ?? 0) === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-sm text-leo-muted py-6">
                        Nessuna revisione registrata
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Istruzioni operative */}
          {(instructions?.length ?? 0) > 0 && (
            <Card className="leo-card border-brand-cyan/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookCheck className="h-4 w-4 text-brand-cyan" /> Istruzioni operative collegate
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(instructions ?? []).map((i: any) => (
                  <div key={i.id} className="rounded-md border border-leo-border bg-leo-card/40 p-3 text-sm">
                    <div className="font-medium">{i.title}</div>
                    <p className="text-xs text-leo-muted mt-1">{i.what_text}</p>
                    {i.when_text && <p className="text-xs mt-1"><span className="text-leo-muted">Quando:</span> {i.when_text}</p>}
                    {i.alarms_generated && (
                      <p className="mt-1 text-xs text-status-orange">⚡ {i.alarms_generated}</p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Format compilabili collegati */}
          {(linkedFormats?.length ?? 0) > 0 && (
            <Card className="leo-card border-brand-green/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-brand-green" /> Format compilabili
                  <Badge variant="green" className="ml-2">{linkedFormats?.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-xs text-leo-muted">
                  Compila uno di questi format per generare automaticamente task, NC o evidenze legate alla procedura.
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {(linkedFormats ?? []).map((l: any) => (
                    <Link key={l.form.id} href={`/forms/${l.form.code}`}
                      className="flex items-center justify-between rounded-md border border-leo-border bg-leo-card/40 px-3 py-2 text-sm hover:bg-leo-card hover:border-brand-cyan">
                      <span>
                        <span className="font-mono text-xs text-brand-cyan">{l.form.code}</span>
                        <div className="mt-0.5">{l.form.title}</div>
                      </span>
                      <div className="flex gap-0.5 shrink-0 ml-2">
                        {l.form.genera_task && <ListChecks className="h-3 w-3 text-status-blue" />}
                        {l.form.genera_nc && <AlertTriangle className="h-3 w-3 text-status-orange" />}
                        {l.form.blocco_operativo && <Lock className="h-3 w-3 text-status-red" />}
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Colonna dx */}
        <div className="space-y-4">
          {/* Anagrafica */}
          <Card className="leo-card">
            <CardHeader>
              <CardTitle className="text-base">Anagrafica documento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div><span className="text-leo-muted">Codice:</span> <span className="font-mono">{doc.code}</span></div>
              <div><span className="text-leo-muted">Tipo:</span> <Badge variant="outline">{doc.type}</Badge></div>
              <div><span className="text-leo-muted">Stato:</span> <Badge variant={doc.status === "attivo" ? "green" : "gray"}>{doc.status}</Badge></div>
              <div><span className="text-leo-muted">Impresa:</span> {(doc as any).company?.name ?? "Gruppo"}</div>
              {(doc as any).process && (
                <div>
                  <span className="text-leo-muted">Processo:</span>{" "}
                  <Link href={`/processes/${(doc as any).process.id}`} className="text-brand-cyan hover:underline">
                    {(doc as any).process.name}
                  </Link>
                </div>
              )}
              {doc.review_frequency_months && (
                <div><span className="text-leo-muted">Frequenza revisione:</span> {doc.review_frequency_months} mesi</div>
              )}
            </CardContent>
          </Card>

          {/* Modifica anagrafica con audit trail */}
          <Card className="leo-card">
            <CardHeader>
              <CardTitle className="text-base">Modifica documento</CardTitle>
            </CardHeader>
            <CardContent>
              <DocumentEditPanel doc={doc} />
            </CardContent>
          </Card>

          {/* Nuova revisione */}
          <Card className="leo-card">
            <CardHeader>
              <CardTitle className="text-base">Nuova revisione</CardTitle>
            </CardHeader>
            <CardContent>
              <RevisionForm documentId={id} />
            </CardContent>
          </Card>

          <AuditTrailPanel entityType="document" entityId={id} showRevisions />
        </div>
      </div>
    </>
  );
}
