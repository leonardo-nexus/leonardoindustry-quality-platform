import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createServerClient } from "@/lib/supabase/server";

const STATUS_VARIANT: Record<string, "blue" | "yellow" | "orange" | "green" | "gray"> = {
  aperta: "blue",
  in_corso: "yellow",
  sospesa: "orange",
  chiusa: "green",
  annullata: "gray",
};

export default async function ProjectsPage() {
  const supabase = await createServerClient();
  const { data: projects } = await supabase
    .from("project")
    .select("id, code, name, customer_name, status, start_date, end_date, company:company_id(name), execution_class:execution_class_id(code)")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <>
      <PageHeader
        title="Commesse"
        description="Cantieri, officine, commesse e progetti UNE-EN 1090"
        actions={
          <Button asChild><Link href="/projects/new"><Plus className="h-4 w-4" /> Nuova commessa</Link></Button>
        }
      />
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Codice</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Impresa</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>EXC</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(projects ?? []).map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs">{p.code}</TableCell>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-xs">{p.company?.name}</TableCell>
                  <TableCell className="text-xs">{p.customer_name ?? "—"}</TableCell>
                  <TableCell>
                    {p.execution_class ? <Badge variant="orange">{p.execution_class.code}</Badge> : "—"}
                  </TableCell>
                  <TableCell><Badge variant={STATUS_VARIANT[p.status] ?? "gray"}>{p.status}</Badge></TableCell>
                  <TableCell><Button asChild variant="ghost" size="sm"><Link href={`/projects/${p.id}`}>Apri</Link></Button></TableCell>
                </TableRow>
              ))}
              {(projects?.length ?? 0) === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
                    Nessuna commessa registrata.
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
