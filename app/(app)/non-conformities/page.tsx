import Link from "next/link";
import { Plus } from "lucide-react";
import { format } from "date-fns";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createServerClient } from "@/lib/supabase/server";

const STATUS_VARIANT: Record<string, "red" | "orange" | "yellow" | "blue" | "green"> = {
  aperta: "red",
  analisi_causa: "orange",
  azione_definita: "yellow",
  in_verifica: "blue",
  chiusa: "green",
};
const SEVERITY_VARIANT: Record<string, "blue" | "orange" | "red"> = {
  minore: "blue",
  maggiore: "orange",
  critica: "red",
};

export default async function NonConformitiesPage() {
  const supabase = await createServerClient();
  const { data: ncs } = await supabase
    .from("non_conformity")
    .select("id, code, title, severity, status, detected_at, company:company_id(name), responsible:responsible_id(first_name,last_name)")
    .order("detected_at", { ascending: false })
    .limit(300);

  return (
    <>
      <PageHeader
        title="Non conformità"
        description="NC da audit, controlli, clienti, fornitori, saldature, incidenti"
        actions={
          <Button asChild><Link href="/non-conformities/new"><Plus className="h-4 w-4" /> Nuova NC</Link></Button>
        }
      />
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Codice</TableHead>
                <TableHead>Titolo</TableHead>
                <TableHead>Impresa</TableHead>
                <TableHead>Gravità</TableHead>
                <TableHead>Rilevata il</TableHead>
                <TableHead>Responsabile</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(ncs ?? []).map((nc: any) => (
                <TableRow key={nc.id}>
                  <TableCell className="font-mono text-xs">{nc.code ?? "—"}</TableCell>
                  <TableCell className="font-medium">{nc.title}</TableCell>
                  <TableCell className="text-xs">{nc.company?.name}</TableCell>
                  <TableCell><Badge variant={SEVERITY_VARIANT[nc.severity] ?? "gray"}>{nc.severity}</Badge></TableCell>
                  <TableCell className="text-xs">{format(new Date(nc.detected_at), "dd/MM/yyyy")}</TableCell>
                  <TableCell className="text-xs">
                    {nc.responsible ? `${nc.responsible.first_name} ${nc.responsible.last_name}` : "—"}
                  </TableCell>
                  <TableCell><Badge variant={STATUS_VARIANT[nc.status] ?? "gray"}>{nc.status}</Badge></TableCell>
                  <TableCell><Button asChild variant="ghost" size="sm"><Link href={`/non-conformities/${nc.id}`}>Apri</Link></Button></TableCell>
                </TableRow>
              ))}
              {(ncs?.length ?? 0) === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">
                    Nessuna NC registrata.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
