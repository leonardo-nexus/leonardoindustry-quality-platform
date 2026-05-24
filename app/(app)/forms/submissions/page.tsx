import Link from "next/link";
import { format } from "date-fns";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createServerClient } from "@/lib/supabase/server";

const STATUS_VARIANT: Record<string, "blue" | "yellow" | "green" | "red" | "gray"> = {
  bozza: "gray",
  compilato: "blue",
  in_verifica: "yellow",
  approvato: "green",
  respinto: "red",
  archiviato: "gray",
};

export default async function SubmissionsPage() {
  const supabase = await createServerClient();
  const { data: subs } = await supabase
    .from("form_submission")
    .select("id, title, status, created_at, submitted_at, is_operational_block, generated_task_id, generated_nc_id, template:template_id(code, title, category), company:company_id(name), submitted_by:submitted_by(first_name,last_name)")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <>
      <PageHeader
        title="Le mie compilazioni"
        description="Storico format compilati · task e NC generati automaticamente"
      />
      <Card className="leo-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Format</TableHead>
                <TableHead>Titolo</TableHead>
                <TableHead>Impresa</TableHead>
                <TableHead>Compilato da</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead>Auto-gen</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(subs ?? []).map((s: any) => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono text-xs text-brand-cyan">{s.template?.code}</TableCell>
                  <TableCell>{s.title || s.template?.title}</TableCell>
                  <TableCell className="text-xs">{s.company?.name}</TableCell>
                  <TableCell className="text-xs">
                    {s.submitted_by ? `${s.submitted_by.first_name} ${s.submitted_by.last_name}` : "—"}
                  </TableCell>
                  <TableCell className="text-xs">{format(new Date(s.created_at), "dd/MM HH:mm")}</TableCell>
                  <TableCell><Badge variant={STATUS_VARIANT[s.status] ?? "gray"}>{s.status}</Badge></TableCell>
                  <TableCell className="text-xs space-x-1">
                    {s.generated_task_id && <Badge variant="blue" className="text-[10px]">task</Badge>}
                    {s.generated_nc_id && <Badge variant="orange" className="text-[10px]">NC</Badge>}
                    {s.is_operational_block && <Badge variant="red" className="text-[10px]">blocco</Badge>}
                  </TableCell>
                  <TableCell>
                    <Link href={`/forms/submissions/${s.id}`} className="text-xs text-brand-cyan hover:underline">Apri</Link>
                  </TableCell>
                </TableRow>
              ))}
              {(subs?.length ?? 0) === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-sm text-leo-muted py-8">
                    Nessuna compilazione ancora. Vai al <Link href="/forms" className="text-brand-cyan underline">catalogo format</Link>.
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
