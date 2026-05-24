import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createServerClient } from "@/lib/supabase/server";
import { ProcessForm } from "./process-form";

const CAT_VARIANT: Record<string, "blue" | "green" | "orange" | "red" | "gray" | "yellow"> = {
  qualita: "blue",
  sicurezza: "red",
  ambiente: "green",
  operativo: "yellow",
  saldatura: "orange",
  direzione: "gray",
  fornitori: "gray",
  hr: "gray",
};

export default async function ProcessesPage() {
  const supabase = await createServerClient();
  const { data: processes } = await supabase
    .from("process")
    .select("id, code, name, category, active")
    .order("category, code");

  return (
    <>
      <PageHeader title="Processi aziendali" description="Spina dorsale del sistema integrato di gestione" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Codice</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(processes ?? []).map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs">{p.code}</TableCell>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>
                        <Badge variant={CAT_VARIANT[p.category] ?? "gray"}>{p.category}</Badge>
                      </TableCell>
                      <TableCell>
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/processes/${p.id}`}>Apri</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardContent className="p-6">
            <h3 className="mb-3 font-semibold text-sm">Nuovo processo</h3>
            <ProcessForm />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
