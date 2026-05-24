import Link from "next/link";
import { Plus } from "lucide-react";
import { format } from "date-fns";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createServerClient } from "@/lib/supabase/server";

const STATUS_VARIANT: Record<string, "blue" | "yellow" | "green" | "red" | "gray"> = {
  pianificata: "blue",
  autorizzata: "yellow",
  eseguita: "yellow",
  controllata: "green",
  non_conforme: "red",
  accettata: "green",
};

export default async function WeldsPage() {
  const supabase = await createServerClient();
  const { data: welds } = await supabase
    .from("weld")
    .select("id, weld_number, status, welded_at, ndt_required, project:project_id(code,name), drawing:drawing_id(code,revision), exc:execution_class_id(code), wps:wps_id(code), welder:welder_id(first_name,last_name)")
    .order("created_at", { ascending: false })
    .limit(300);

  return (
    <>
      <PageHeader
        title="Saldature"
        description="Registro saldature commesse, controlli VT/CND e dossier"
        actions={
          <Button asChild><Link href="/welding/welds/new"><Plus className="h-4 w-4" /> Nuova saldatura</Link></Button>
        }
      />
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N°</TableHead>
                <TableHead>Commessa</TableHead>
                <TableHead>Disegno</TableHead>
                <TableHead>EXC</TableHead>
                <TableHead>WPS</TableHead>
                <TableHead>Saldatore</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>CND</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(welds ?? []).map((w: any) => (
                <TableRow key={w.id}>
                  <TableCell className="font-mono">{w.weld_number}</TableCell>
                  <TableCell className="text-xs">{w.project?.code}</TableCell>
                  <TableCell className="text-xs">{w.drawing?.code ?? "—"}</TableCell>
                  <TableCell><Badge variant="orange">{w.exc?.code}</Badge></TableCell>
                  <TableCell className="text-xs">{w.wps?.code}</TableCell>
                  <TableCell className="text-xs">{w.welder?.first_name} {w.welder?.last_name}</TableCell>
                  <TableCell className="text-xs">{w.welded_at ? format(new Date(w.welded_at), "dd/MM/yyyy") : "—"}</TableCell>
                  <TableCell>{w.ndt_required ? <Badge variant="yellow">Sì</Badge> : <Badge variant="gray">No</Badge>}</TableCell>
                  <TableCell><Badge variant={STATUS_VARIANT[w.status] ?? "gray"}>{w.status}</Badge></TableCell>
                  <TableCell><Button asChild variant="ghost" size="sm"><Link href={`/welding/welds/${w.id}`}>Apri</Link></Button></TableCell>
                </TableRow>
              ))}
              {(welds?.length ?? 0) === 0 && (
                <TableRow><TableCell colSpan={10} className="text-center text-sm text-muted-foreground py-8">Nessuna saldatura registrata</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
