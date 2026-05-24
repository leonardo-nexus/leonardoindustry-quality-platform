import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { ListChecks, AlertTriangle, Lock, FileText, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createServerClient } from "@/lib/supabase/server";
import { FormCompilation } from "./form-compilation";

export default async function FormTemplateDetailPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const supabase = await createServerClient();
  const { data: template } = await supabase
    .from("form_template")
    .select("*, process:process_id(id, name, code)")
    .eq("code", code)
    .maybeSingle();
  if (!template) notFound();

  // Procedure collegate
  const { data: linkedDocs } = await supabase
    .from("procedure_format_link")
    .select("ordering, document:document_id(id, code, title, company:company_id(name))")
    .eq("form_template_id", template.id);

  // Ultime compilazioni di questo template
  const { data: recentSubs } = await supabase
    .from("form_submission")
    .select("id, title, status, submitted_at, submitted_by:submitted_by(first_name,last_name), company:company_id(name)")
    .eq("template_id", template.id)
    .order("created_at", { ascending: false })
    .limit(10);

  return (
    <>
      <PageHeader
        title={`${template.code} · ${template.title}`}
        description={`${(template as any).process?.name ?? "—"} · frequenza ${template.frequenza}`}
        actions={
          <Button asChild variant="outline">
            <Link href="/forms">← Catalogo</Link>
          </Button>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="leo-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-brand-cyan" />
                Nuova compilazione
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FormCompilation
                templateId={template.id}
                templateCode={template.code}
                templateTitle={template.title}
                schema={template.schema}
              />
            </CardContent>
          </Card>
        </div>
        <div className="space-y-4">
          {/* Pannello automazioni */}
          <Card className="leo-card">
            <CardHeader>
              <CardTitle className="text-base">Automazioni</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2"><ListChecks className="h-4 w-4 text-status-blue" /> Genera task</span>
                <Badge variant={template.genera_task ? "green" : "gray"}>{template.genera_task ? "Sì" : "No"}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-status-orange" /> Genera NC</span>
                <Badge variant={template.genera_nc ? "orange" : "gray"}>{template.genera_nc ? "Sì" : "No"}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2"><Lock className="h-4 w-4 text-status-red" /> Blocco operativo</span>
                <Badge variant={template.blocco_operativo ? "red" : "gray"}>{template.blocco_operativo ? "Sì" : "No"}</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Procedure collegate */}
          {(linkedDocs?.length ?? 0) > 0 && (
            <Card className="leo-card">
              <CardHeader>
                <CardTitle className="text-base">Procedure collegate</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(linkedDocs ?? []).map((l: any) => (
                  <Link
                    key={l.document.id}
                    href={`/documents/${l.document.id}`}
                    className="flex items-center justify-between rounded-md bg-leo-card/40 px-3 py-2 text-sm hover:bg-leo-card"
                  >
                    <span>
                      <span className="font-mono text-xs text-brand-cyan">{l.document.code}</span>
                      <span className="ml-2">{l.document.title}</span>
                    </span>
                    <ArrowRight className="h-3 w-3 text-leo-muted" />
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Ultime compilazioni */}
      <Card className="leo-card">
        <CardHeader>
          <CardTitle className="text-base">Ultime compilazioni</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Titolo</TableHead>
                <TableHead>Impresa</TableHead>
                <TableHead>Compilato da</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(recentSubs ?? []).map((s: any) => (
                <TableRow key={s.id}>
                  <TableCell>{s.title ?? "—"}</TableCell>
                  <TableCell className="text-xs">{s.company?.name}</TableCell>
                  <TableCell className="text-xs">
                    {s.submitted_by ? `${s.submitted_by.first_name} ${s.submitted_by.last_name}` : "—"}
                  </TableCell>
                  <TableCell className="text-xs">
                    {s.submitted_at ? format(new Date(s.submitted_at), "dd/MM/yy HH:mm") : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{s.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <Link href={`/forms/submissions/${s.id}`} className="text-xs text-brand-cyan hover:underline">Apri</Link>
                  </TableCell>
                </TableRow>
              ))}
              {(recentSubs?.length ?? 0) === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-xs text-leo-muted py-4">
                    Nessuna compilazione ancora — sii il primo a compilare questo format
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
