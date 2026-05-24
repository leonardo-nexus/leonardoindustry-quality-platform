import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createServerClient } from "@/lib/supabase/server";
import { LinkRequirementForm } from "./link-requirement-form";

export default async function ProcessDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerClient();

  const { data: process } = await supabase.from("process").select("*").eq("id", id).maybeSingle();
  if (!process) notFound();

  const { data: requirements } = await supabase
    .from("process_requirement")
    .select("id, applicability, notes, requirement:standard_requirement(id, clause, title, standard:standard_id(code,version))")
    .eq("process_id", id);

  const { data: allRequirements } = await supabase
    .from("standard_requirement")
    .select("id, clause, title, standard:standard_id(code)")
    .order("clause");

  return (
    <>
      <PageHeader
        title={process.name}
        description={`${process.code} · categoria: ${process.category}`}
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Requisiti normativi coperti</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
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
                      <TableCell className="text-xs">
                        {r.requirement?.standard?.code} {r.requirement?.standard?.version}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{r.requirement?.clause}</TableCell>
                      <TableCell>{r.requirement?.title}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            r.applicability === "applicabile"
                              ? "green"
                              : r.applicability === "parziale"
                                ? "yellow"
                                : "gray"
                          }
                        >
                          {r.applicability}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(requirements?.length ?? 0) === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-xs text-muted-foreground py-6">
                        Nessun requisito collegato
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
            <CardTitle>Collega requisito</CardTitle>
          </CardHeader>
          <CardContent>
            <LinkRequirementForm processId={id} requirements={allRequirements ?? []} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
