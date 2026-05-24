import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createServerClient } from "@/lib/supabase/server";
import { DrawingForm } from "./drawing-form";

const DRAWING_STATUS_VARIANT: Record<string, "yellow" | "green" | "gray"> = {
  bozza: "yellow",
  attivo: "green",
  in_revisione: "yellow",
  obsoleto: "gray",
};

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerClient();
  const { data: project } = await supabase
    .from("project")
    .select("*, company:company_id(name), site:site_id(name), execution_class:execution_class_id(code), pm:project_manager_id(first_name,last_name)")
    .eq("id", id)
    .maybeSingle();
  if (!project) notFound();

  const { data: drawings } = await supabase
    .from("drawing")
    .select("id, code, revision, title, status, approved_at")
    .eq("project_id", id)
    .order("code");

  const { data: welds } = await supabase
    .from("weld")
    .select("id, weld_number, status, welded_at, exc:execution_class_id(code), wps:wps_id(code), welder:welder_id(first_name,last_name)")
    .eq("project_id", id)
    .order("weld_number");

  return (
    <>
      <PageHeader
        title={`${project.code} · ${project.name}`}
        description={`${(project as any).company?.name} · ${project.customer_name ?? "—"} · EXC ${(project as any).execution_class?.code ?? "—"}`}
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Disegni</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Codice</TableHead>
                    <TableHead>Rev</TableHead>
                    <TableHead>Titolo</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead>Approvato il</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(drawings ?? []).map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-mono text-xs">{d.code}</TableCell>
                      <TableCell className="font-mono text-xs">{d.revision}</TableCell>
                      <TableCell>{d.title ?? "—"}</TableCell>
                      <TableCell><Badge variant={DRAWING_STATUS_VARIANT[d.status] ?? "gray"}>{d.status}</Badge></TableCell>
                      <TableCell className="text-xs">{d.approved_at ? format(new Date(d.approved_at), "dd/MM/yyyy") : "—"}</TableCell>
                    </TableRow>
                  ))}
                  {(drawings?.length ?? 0) === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-4">
                        Nessun disegno registrato
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Saldature commessa
                <Link className="text-sm underline font-normal" href={`/welding/welds/new?project=${id}`}>+ Nuova saldatura</Link>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>N°</TableHead>
                    <TableHead>EXC</TableHead>
                    <TableHead>WPS</TableHead>
                    <TableHead>Saldatore</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Stato</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(welds ?? []).map((w: any) => (
                    <TableRow key={w.id}>
                      <TableCell className="font-mono">{w.weld_number}</TableCell>
                      <TableCell><Badge variant="orange">{w.exc?.code}</Badge></TableCell>
                      <TableCell className="text-xs">{w.wps?.code}</TableCell>
                      <TableCell className="text-xs">{w.welder?.first_name} {w.welder?.last_name}</TableCell>
                      <TableCell className="text-xs">{w.welded_at ? format(new Date(w.welded_at), "dd/MM/yyyy") : "—"}</TableCell>
                      <TableCell><Badge variant="outline">{w.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                  {(welds?.length ?? 0) === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-4">
                        Nessuna saldatura registrata
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
            <CardTitle>Nuovo disegno</CardTitle>
          </CardHeader>
          <CardContent>
            <DrawingForm projectId={id} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
