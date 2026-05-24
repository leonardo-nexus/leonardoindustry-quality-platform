import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createServerClient } from "@/lib/supabase/server";
import { MaterialForm } from "./material-form";

const STATUS_VARIANT: Record<string, "green" | "yellow" | "red" | "gray"> = {
  disponibile: "green",
  usato: "gray",
  bloccato: "red",
  non_conforme: "red",
};

export default async function MaterialsPage() {
  const supabase = await createServerClient();
  const [{ data: materials }, { data: companies }, { data: projects }] = await Promise.all([
    supabase
      .from("material_lot")
      .select("id, heat_number, material_grade, thickness_mm, status, company:company_id(name), project:project_id(code, name)")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase.from("company").select("id, name").order("name"),
    supabase.from("project").select("id, code, name").order("code"),
  ]);
  return (
    <>
      <PageHeader title="Lotti materiali e certificati 3.1" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Colata (heat)</TableHead>
                    <TableHead>Qualità</TableHead>
                    <TableHead>Spessore</TableHead>
                    <TableHead>Impresa</TableHead>
                    <TableHead>Commessa</TableHead>
                    <TableHead>Stato</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(materials ?? []).map((m: any) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-mono text-xs">{m.heat_number ?? "—"}</TableCell>
                      <TableCell>{m.material_grade}</TableCell>
                      <TableCell className="text-xs">{m.thickness_mm ?? "—"} mm</TableCell>
                      <TableCell className="text-xs">{m.company?.name}</TableCell>
                      <TableCell className="text-xs">{m.project?.code ?? "—"}</TableCell>
                      <TableCell><Badge variant={STATUS_VARIANT[m.status] ?? "gray"}>{m.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                  {(materials?.length ?? 0) === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-6">Nessun lotto materiale registrato</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardContent className="p-6">
            <h3 className="mb-3 font-semibold text-sm">Nuovo lotto</h3>
            <MaterialForm companies={companies ?? []} projects={projects ?? []} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
