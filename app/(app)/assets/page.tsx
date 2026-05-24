import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createServerClient } from "@/lib/supabase/server";

const STATUS_VARIANT: Record<string, "green" | "yellow" | "red" | "gray"> = {
  disponibile: "green",
  assegnato: "yellow",
  fuori_servizio: "red",
  dismesso: "gray",
};

export default async function AssetsPage() {
  const supabase = await createServerClient();
  const { data: assets } = await supabase
    .from("asset")
    .select("id, code, asset_type, manufacturer, model, status, company:company_id(name), site:site_id(name)")
    .order("code");

  return (
    <>
      <PageHeader
        title="Asset, strumenti e attrezzature"
        description="Strumenti di misura, saldatrici, veicoli, attrezzature, DPI ed estintori"
        actions={
          <Button asChild><Link href="/assets/new"><Plus className="h-4 w-4" /> Nuovo asset</Link></Button>
        }
      />
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Codice</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Marca / Modello</TableHead>
                <TableHead>Impresa</TableHead>
                <TableHead>Sede</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(assets ?? []).map((a: any) => (
                <TableRow key={a.id}>
                  <TableCell className="font-mono text-xs">{a.code}</TableCell>
                  <TableCell><Badge variant="outline">{a.asset_type}</Badge></TableCell>
                  <TableCell className="text-xs">
                    {a.manufacturer ?? ""} {a.model ?? ""}
                  </TableCell>
                  <TableCell className="text-xs">{a.company?.name}</TableCell>
                  <TableCell className="text-xs">{a.site?.name ?? "—"}</TableCell>
                  <TableCell><Badge variant={STATUS_VARIANT[a.status] ?? "gray"}>{a.status}</Badge></TableCell>
                  <TableCell>
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/assets/${a.id}`}>Apri</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {(assets?.length ?? 0) === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
                    Nessun asset registrato.
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
