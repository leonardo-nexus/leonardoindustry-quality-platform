import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createServerClient } from "@/lib/supabase/server";

export default async function PeoplePage() {
  const supabase = await createServerClient();
  const { data: people } = await supabase
    .from("person")
    .select("id, first_name, last_name, email, active, company:company_id(name), role:role_id(name)")
    .order("last_name");

  return (
    <>
      <PageHeader
        title="Persone e competenze"
        description="Anagrafica risorse umane, ruoli e qualifiche"
        actions={
          <Button asChild>
            <Link href="/people/new"><Plus className="h-4 w-4" /> Nuova persona</Link>
          </Button>
        }
      />
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cognome</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Impresa</TableHead>
                <TableHead>Ruolo</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(people ?? []).map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.last_name}</TableCell>
                  <TableCell>{p.first_name}</TableCell>
                  <TableCell className="text-xs">{p.email ?? "—"}</TableCell>
                  <TableCell className="text-xs">{p.company?.name}</TableCell>
                  <TableCell className="text-xs">{p.role?.name ?? "—"}</TableCell>
                  <TableCell>
                    {p.active ? <Badge variant="green">Attiva</Badge> : <Badge variant="gray">Inattiva</Badge>}
                  </TableCell>
                  <TableCell>
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/people/${p.id}`}>Apri</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {(people?.length ?? 0) === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
                    Nessuna persona ancora.
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
