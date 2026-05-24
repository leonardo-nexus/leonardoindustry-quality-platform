import { format } from "date-fns";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DeadlineBadge } from "@/components/status/deadline-badge";
import { createServerClient } from "@/lib/supabase/server";
import { WpqrForm } from "./wpqr-form";

export default async function WpqrPage() {
  const supabase = await createServerClient();
  const [{ data: wpqrList }, { data: wpsList }] = await Promise.all([
    supabase
      .from("wpqr")
      .select("id, certificate_code, issue_date, expiry_date, status, wps:wps_id(code, revision)")
      .order("issue_date", { ascending: false }),
    supabase.from("wps").select("id, code, revision").order("code"),
  ]);
  return (
    <>
      <PageHeader title="WPQR - Welding Procedure Qualification Records" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Certificato</TableHead>
                    <TableHead>WPS</TableHead>
                    <TableHead>Emissione</TableHead>
                    <TableHead>Scadenza</TableHead>
                    <TableHead>Stato</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(wpqrList ?? []).map((w: any) => (
                    <TableRow key={w.id}>
                      <TableCell className="font-mono text-xs">{w.certificate_code}</TableCell>
                      <TableCell className="text-xs">{w.wps?.code} r{w.wps?.revision}</TableCell>
                      <TableCell className="text-xs">{w.issue_date ? format(new Date(w.issue_date), "dd/MM/yyyy") : "—"}</TableCell>
                      <TableCell>{w.expiry_date ? <DeadlineBadge dueDate={w.expiry_date} /> : "—"}</TableCell>
                      <TableCell><Badge variant="outline">{w.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                  {(wpqrList?.length ?? 0) === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-6">Nessuna WPQR registrata</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardContent className="p-6">
            <h3 className="mb-3 font-semibold text-sm">Nuova WPQR</h3>
            <WpqrForm wpsList={wpsList ?? []} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
