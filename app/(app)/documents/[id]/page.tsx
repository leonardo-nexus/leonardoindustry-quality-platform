import { notFound } from "next/navigation";
import { format } from "date-fns";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createServerClient } from "@/lib/supabase/server";
import { RevisionForm } from "./revision-form";
import { DownloadButton } from "./download-button";
import { DeadlineBadge } from "@/components/status/deadline-badge";

export default async function DocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerClient();

  const { data: doc } = await supabase
    .from("document")
    .select("*, company:company_id(name), process:process_id(name)")
    .eq("id", id)
    .maybeSingle();
  if (!doc) notFound();

  const { data: revisions } = await supabase
    .from("document_revision")
    .select("id, revision, issue_date, next_review_date, is_current, file_id, file:file_id(file_name, size_bytes)")
    .eq("document_id", id)
    .order("issue_date", { ascending: false });

  return (
    <>
      <PageHeader
        title={`${doc.code} · ${doc.title}`}
        description={`${doc.type} · ${(doc as any).company?.name ?? "Gruppo"} · ${(doc as any).process?.name ?? "—"}`}
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
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
                          <span className="text-xs text-muted-foreground">Nessuno</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(revisions?.length ?? 0) === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-6">
                        Nessuna revisione registrata
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Nuova revisione</CardTitle>
          </CardHeader>
          <CardContent>
            <RevisionForm documentId={id} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
