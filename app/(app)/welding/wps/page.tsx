import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createServerClient } from "@/lib/supabase/server";
import { WpsForm } from "./wps-form";

const STATUS_VARIANT: Record<string, "green" | "yellow" | "gray"> = {
  valida: "green",
  bozza: "yellow",
  sospesa: "gray",
  obsoleta: "gray",
};

export default async function WpsPage() {
  const supabase = await createServerClient();
  const [{ data: wpsList }, { data: companies }, { data: processes }] = await Promise.all([
    supabase
      .from("wps")
      .select("id, code, revision, status, material_group, thickness_min_mm, thickness_max_mm, position_range, welding_process:welding_process_id(code,name), company:company_id(name)")
      .order("code"),
    supabase.from("company").select("id, name").order("name"),
    supabase.from("welding_process").select("id, code, name").order("code"),
  ]);

  return (
    <>
      <PageHeader title="WPS - Welding Procedure Specifications" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Codice</TableHead>
                    <TableHead>Rev</TableHead>
                    <TableHead>Processo</TableHead>
                    <TableHead>Materiale</TableHead>
                    <TableHead>Spessore</TableHead>
                    <TableHead>Stato</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(wpsList ?? []).map((w: any) => (
                    <TableRow key={w.id}>
                      <TableCell className="font-mono">{w.code}</TableCell>
                      <TableCell className="font-mono text-xs">{w.revision}</TableCell>
                      <TableCell className="text-xs">{w.welding_process?.code} - {w.welding_process?.name}</TableCell>
                      <TableCell className="text-xs">{w.material_group ?? "—"}</TableCell>
                      <TableCell className="text-xs">
                        {w.thickness_min_mm ?? "?"}–{w.thickness_max_mm ?? "?"} mm
                      </TableCell>
                      <TableCell><Badge variant={STATUS_VARIANT[w.status] ?? "gray"}>{w.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                  {(wpsList?.length ?? 0) === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-6">Nessuna WPS</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardContent className="p-6">
            <h3 className="mb-3 font-semibold text-sm">Nuova WPS</h3>
            <WpsForm companies={companies ?? []} processes={processes ?? []} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
