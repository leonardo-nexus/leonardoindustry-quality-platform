import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DeadlineBadge } from "@/components/status/deadline-badge";
import { Wrench } from "lucide-react";
import { createServerClient } from "@/lib/supabase/server";
import { AssetEventForm } from "./event-form";
import { AuditTrailPanel } from "@/components/audit/audit-trail-panel";
import { Button } from "@/components/ui/button";

const RESULT_VARIANT: Record<string, "green" | "red" | "yellow"> = {
  conforme: "green",
  non_conforme: "red",
  limitato: "yellow",
};

export default async function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerClient();
  const { data: asset } = await supabase
    .from("asset")
    .select("*, company:company_id(name), site:site_id(name)")
    .eq("id", id)
    .maybeSingle();
  if (!asset) notFound();

  const { data: events } = await supabase
    .from("asset_event")
    .select("id, event_type, event_date, next_due_date, performed_by, result, notes")
    .eq("asset_id", id)
    .order("event_date", { ascending: false });

  return (
    <>
      <PageHeader
        title={`${asset.code} · ${asset.asset_type}`}
        description={`${(asset as any).company?.name} · ${asset.manufacturer ?? ""} ${asset.model ?? ""}`}
        actions={
          <Button asChild><Link href={`/assets/${id}/interventions`}><Wrench className="mr-1 h-3 w-3" /> Interventi/Manutenzioni</Link></Button>
        }
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Storico eventi (tarature / manutenzioni / revisioni)</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Esito</TableHead>
                    <TableHead>Prossima scadenza</TableHead>
                    <TableHead>Eseguita da</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(events ?? []).map((e: any) => (
                    <TableRow key={e.id}>
                      <TableCell><Badge variant="outline">{e.event_type}</Badge></TableCell>
                      <TableCell className="text-xs">{format(new Date(e.event_date), "dd/MM/yyyy")}</TableCell>
                      <TableCell>
                        {e.result ? <Badge variant={RESULT_VARIANT[e.result] ?? "gray"}>{e.result}</Badge> : "—"}
                      </TableCell>
                      <TableCell>
                        {e.next_due_date ? <DeadlineBadge dueDate={e.next_due_date} /> : "—"}
                      </TableCell>
                      <TableCell className="text-xs">{e.performed_by ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                  {(events?.length ?? 0) === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-4">
                        Nessun evento registrato
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
            <CardTitle>Registra evento</CardTitle>
          </CardHeader>
          <CardContent>
            <AssetEventForm assetId={id} />
          </CardContent>
        </Card>
      </div>
      <div className="mt-6">
        <AuditTrailPanel entityType="asset" entityId={id} showRevisions={false} />
      </div>
    </>
  );
}
