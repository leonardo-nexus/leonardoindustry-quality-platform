import { format } from "date-fns";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DeadlineBadge } from "@/components/status/deadline-badge";
import { createServerClient } from "@/lib/supabase/server";
import { WelderForm } from "./welder-form";

export default async function WeldersPage() {
  const supabase = await createServerClient();
  const [{ data: quals }, { data: people }, { data: processes }] = await Promise.all([
    supabase
      .from("welder_qualification")
      .select("id, certificate_code, material_group, position_range, issue_date, expiry_date, status, person:person_id(first_name,last_name), welding_process:welding_process_id(code,name)")
      .order("expiry_date"),
    supabase.from("person").select("id, first_name, last_name").order("last_name"),
    supabase.from("welding_process").select("id, code, name").order("code"),
  ]);
  return (
    <>
      <PageHeader title="Qualifiche saldatori" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Saldatore</TableHead>
                    <TableHead>Processo</TableHead>
                    <TableHead>Certificato</TableHead>
                    <TableHead>Posizioni</TableHead>
                    <TableHead>Scadenza</TableHead>
                    <TableHead>Stato</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(quals ?? []).map((q: any) => (
                    <TableRow key={q.id}>
                      <TableCell>{q.person?.first_name} {q.person?.last_name}</TableCell>
                      <TableCell><Badge variant="orange">{q.welding_process?.code}</Badge></TableCell>
                      <TableCell className="font-mono text-xs">{q.certificate_code}</TableCell>
                      <TableCell className="text-xs">{q.position_range ?? "—"}</TableCell>
                      <TableCell><DeadlineBadge dueDate={q.expiry_date} /></TableCell>
                      <TableCell><Badge variant="outline">{q.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                  {(quals?.length ?? 0) === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-6">Nessuna qualifica registrata</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardContent className="p-6">
            <h3 className="mb-3 font-semibold text-sm">Nuova qualifica</h3>
            <WelderForm people={people ?? []} processes={processes ?? []} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
