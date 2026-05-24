import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createServerClient } from "@/lib/supabase/server";

const STATUS_VARIANT: Record<string, "green" | "blue" | "yellow" | "orange" | "red" | "gray" | "black"> = {
  attivo: "green",
  in_revisione: "yellow",
  bozza: "blue",
  sospeso: "orange",
  obsoleto: "gray",
  archiviato: "gray",
};

export default async function DocumentsPage() {
  const supabase = await createServerClient();
  const { data: documents } = await supabase
    .from("document")
    .select("id, code, title, type, status, company:company_id(name), process:process_id(name)")
    .order("code")
    .limit(200);

  return (
    <>
      <PageHeader
        title="Documenti"
        description="Procedure, istruzioni, moduli, registri e documenti esterni"
        actions={
          <Button asChild>
            <Link href="/documents/new">
              <Plus className="h-4 w-4" /> Nuovo documento
            </Link>
          </Button>
        }
      />
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Codice</TableHead>
                <TableHead>Titolo</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Processo</TableHead>
                <TableHead>Impresa</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(documents ?? []).map((d: any) => (
                <TableRow key={d.id}>
                  <TableCell className="font-mono text-xs">{d.code}</TableCell>
                  <TableCell className="font-medium">{d.title}</TableCell>
                  <TableCell><Badge variant="outline">{d.type}</Badge></TableCell>
                  <TableCell className="text-xs">{d.process?.name ?? "—"}</TableCell>
                  <TableCell className="text-xs">{d.company?.name ?? "Gruppo"}</TableCell>
                  <TableCell><Badge variant={STATUS_VARIANT[d.status] ?? "gray"}>{d.status}</Badge></TableCell>
                  <TableCell>
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/documents/${d.id}`}>Apri</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {(documents?.length ?? 0) === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
                    Nessun documento ancora.
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
