import Link from "next/link";
import { Plus } from "lucide-react";
import { format } from "date-fns";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DeadlineBadge } from "@/components/status/deadline-badge";
import { createServerClient } from "@/lib/supabase/server";

const PRIORITY_VARIANT: Record<string, "gray" | "blue" | "orange" | "red"> = {
  bassa: "gray",
  media: "blue",
  alta: "orange",
  critica: "red",
};
const STATUS_VARIANT: Record<string, "blue" | "yellow" | "red" | "green" | "gray"> = {
  aperta: "blue",
  in_corso: "yellow",
  scaduta: "red",
  chiusa: "green",
  verificata: "green",
};

export default async function DeadlinesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; company?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createServerClient();
  let query = supabase
    .from("task")
    .select("id, title, source_type, due_date, priority, status, blocks_operations, company:company_id(name), responsible:responsible_id(first_name,last_name)")
    .order("due_date", { ascending: true })
    .limit(300);
  if (params.status) query = query.eq("status", params.status);
  if (params.company) query = query.eq("company_id", params.company);
  const { data: tasks } = await query;

  return (
    <>
      <PageHeader
        title="Scadenze e task"
        description="Calendario operativo: documenti, audit, qualifiche, tarature, formazione, saldature"
        actions={
          <Button asChild>
            <Link href="/deadlines/new">
              <Plus className="h-4 w-4" /> Nuovo task
            </Link>
          </Button>
        }
      />
      <div className="mb-4 flex gap-2 text-sm">
        <Link className="rounded-md border px-3 py-1 hover:bg-slate-50" href="/deadlines">Tutte</Link>
        <Link className="rounded-md border px-3 py-1 hover:bg-slate-50" href="/deadlines?status=aperta">Aperte</Link>
        <Link className="rounded-md border px-3 py-1 hover:bg-slate-50" href="/deadlines?status=in_corso">In corso</Link>
        <Link className="rounded-md border px-3 py-1 hover:bg-slate-50" href="/deadlines?status=scaduta">Scadute</Link>
        <Link className="rounded-md border px-3 py-1 hover:bg-slate-50" href="/deadlines?status=chiusa">Chiuse</Link>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Titolo</TableHead>
                <TableHead>Origine</TableHead>
                <TableHead>Impresa</TableHead>
                <TableHead>Responsabile</TableHead>
                <TableHead>Scadenza</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead>Priorità</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(tasks ?? []).map((t: any) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">
                    {t.title}
                    {t.blocks_operations && <Badge variant="black" className="ml-2 text-[10px]">BLOCCO</Badge>}
                  </TableCell>
                  <TableCell><Badge variant="outline">{t.source_type}</Badge></TableCell>
                  <TableCell className="text-xs">{t.company?.name ?? "—"}</TableCell>
                  <TableCell className="text-xs">
                    {t.responsible ? `${t.responsible.first_name} ${t.responsible.last_name}` : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono">{format(new Date(t.due_date), "dd/MM/yyyy")}</span>
                      <DeadlineBadge
                        dueDate={t.due_date}
                        completed={t.status === "chiusa" || t.status === "verificata"}
                      />
                    </div>
                  </TableCell>
                  <TableCell><Badge variant={STATUS_VARIANT[t.status] ?? "gray"}>{t.status}</Badge></TableCell>
                  <TableCell><Badge variant={PRIORITY_VARIANT[t.priority] ?? "gray"}>{t.priority}</Badge></TableCell>
                </TableRow>
              ))}
              {(tasks?.length ?? 0) === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
                    Nessuna scadenza con i filtri correnti.
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
