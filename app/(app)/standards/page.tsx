import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { createServerClient } from "@/lib/supabase/server";
import { StandardForm, RequirementForm } from "./standard-forms";

export default async function StandardsPage() {
  const supabase = await createServerClient();
  const { data: standards } = await supabase
    .from("standard")
    .select("id, code, version, title")
    .order("code");

  const { data: requirements } = await supabase
    .from("standard_requirement")
    .select("id, clause, title, standard_id, standard:standard_id(code,version)")
    .order("clause");

  return (
    <>
      <PageHeader
        title="Norme e requisiti"
        description="ISO 9001 / 45001 / 14001, UNE-EN 1090 e norme correlate"
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Codice</TableHead>
                    <TableHead>Versione</TableHead>
                    <TableHead>Titolo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(standards ?? []).map((s) => (
                    <TableRow key={s.id}>
                      <TableCell><Badge variant="blue">{s.code}</Badge></TableCell>
                      <TableCell className="text-xs">{s.version ?? "—"}</TableCell>
                      <TableCell>{s.title}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Norma</TableHead>
                    <TableHead>Clausola</TableHead>
                    <TableHead>Titolo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(requirements ?? []).map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs font-mono">{r.standard?.code}</TableCell>
                      <TableCell className="text-xs font-mono">{r.clause}</TableCell>
                      <TableCell>{r.title}</TableCell>
                    </TableRow>
                  ))}
                  {(requirements?.length ?? 0) === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-xs text-muted-foreground py-6">
                        Nessun requisito caricato — usa il form a destra
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6 space-y-3">
              <h3 className="font-semibold text-sm">Nuova norma</h3>
              <StandardForm />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 space-y-3">
              <h3 className="font-semibold text-sm">Nuovo requisito</h3>
              <RequirementForm standards={standards ?? []} />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
