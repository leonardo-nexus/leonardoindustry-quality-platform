import { notFound } from "next/navigation";
import { format } from "date-fns";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createServerClient } from "@/lib/supabase/server";
import { InspectionForm } from "./inspection-form";
import { WeldStatusButtons } from "./status-buttons";

const INSPECTION_RESULT_VARIANT: Record<string, "green" | "red" | "yellow"> = {
  conforme: "green",
  non_conforme: "red",
  limitato: "yellow",
};

export default async function WeldDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerClient();
  const { data: weld } = await supabase
    .from("weld")
    .select("*, project:project_id(id, code, name, company_id), drawing:drawing_id(code, revision, status), exc:execution_class_id(code), wps:wps_id(code, revision, status), welder:welder_id(first_name, last_name), material:material_lot_id(material_grade, heat_number)")
    .eq("id", id)
    .maybeSingle();
  if (!weld) notFound();

  const { data: inspections } = await supabase
    .from("weld_inspection")
    .select("id, inspection_type, inspection_date, result, notes, inspector:inspector_id(first_name,last_name)")
    .eq("weld_id", id)
    .order("inspection_date", { ascending: false });

  const { data: people } = await supabase.from("person").select("id, first_name, last_name").order("last_name");

  return (
    <>
      <PageHeader
        title={`Saldatura ${weld.weld_number}`}
        description={`Commessa ${(weld as any).project?.code} · EXC ${(weld as any).exc?.code}`}
        actions={<WeldStatusButtons weldId={id} currentStatus={weld.status} />}
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Catena tecnica</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div><span className="font-medium">Disegno: </span>{(weld as any).drawing?.code} r{(weld as any).drawing?.revision} <Badge variant="outline">{(weld as any).drawing?.status ?? "—"}</Badge></div>
              <div><span className="font-medium">WPS: </span>{(weld as any).wps?.code} r{(weld as any).wps?.revision} <Badge variant="outline">{(weld as any).wps?.status}</Badge></div>
              <div><span className="font-medium">Saldatore: </span>{(weld as any).welder?.first_name} {(weld as any).welder?.last_name}</div>
              <div><span className="font-medium">Materiale: </span>{(weld as any).material?.material_grade ?? "—"} {(weld as any).material?.heat_number ? `(${(weld as any).material.heat_number})` : ""}</div>
              <div><span className="font-medium">Eseguita il: </span>{weld.welded_at ? format(new Date(weld.welded_at), "dd/MM/yyyy") : "—"}</div>
              <div><span className="font-medium">CND richiesto: </span>{weld.ndt_required ? "Sì" : "No"}</div>
              <div><span className="font-medium">Stato: </span><Badge variant="outline">{weld.status}</Badge></div>
              {weld.notes && <div><span className="font-medium">Note: </span>{weld.notes}</div>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Controlli VT / CND</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Ispettore</TableHead>
                    <TableHead>Esito</TableHead>
                    <TableHead>Note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(inspections ?? []).map((i: any) => (
                    <TableRow key={i.id}>
                      <TableCell><Badge variant="outline">{i.inspection_type}</Badge></TableCell>
                      <TableCell className="text-xs">{format(new Date(i.inspection_date), "dd/MM/yyyy")}</TableCell>
                      <TableCell className="text-xs">{i.inspector ? `${i.inspector.first_name} ${i.inspector.last_name}` : "—"}</TableCell>
                      <TableCell><Badge variant={INSPECTION_RESULT_VARIANT[i.result] ?? "gray"}>{i.result}</Badge></TableCell>
                      <TableCell className="text-xs">{i.notes ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                  {(inspections?.length ?? 0) === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-4">Nessun controllo registrato</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Registra controllo</CardTitle>
          </CardHeader>
          <CardContent>
            <InspectionForm weldId={id} people={people ?? []} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
