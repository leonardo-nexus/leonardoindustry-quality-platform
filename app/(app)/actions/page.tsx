import Link from "next/link";
import { format } from "date-fns";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DeadlineBadge } from "@/components/status/deadline-badge";
import { createServerClient } from "@/lib/supabase/server";

const STATUS_VARIANT: Record<string, "blue" | "yellow" | "green" | "red" | "gray"> = {
  aperta: "blue",
  in_corso: "yellow",
  completata: "blue",
  efficace: "green",
  non_efficace: "red",
};

export default async function ActionsPage() {
  const supabase = await createServerClient();
  const { data: actions } = await supabase
    .from("corrective_action")
    .select("id, title, due_date, status, company:company_id(name), responsible:responsible_id(first_name,last_name), nc:non_conformity_id(code, title)")
    .order("due_date", { ascending: true })
    .limit(300);

  return (
    <>
      <PageHeader
        title="Azioni correttive"
        description="Catena NC → analisi → azione → verifica efficacia"
      />
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Titolo</TableHead>
                <TableHead>NC collegata</TableHead>
                <TableHead>Impresa</TableHead>
                <TableHead>Responsabile</TableHead>
                <TableHead>Scadenza</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(actions ?? []).map((a: any) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.title}</TableCell>
                  <TableCell className="text-xs">{a.nc?.title ?? "—"}</TableCell>
                  <TableCell className="text-xs">{a.company?.name}</TableCell>
                  <TableCell className="text-xs">
                    {a.responsible ? `${a.responsible.first_name} ${a.responsible.last_name}` : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono">{format(new Date(a.due_date), "dd/MM/yyyy")}</span>
                      <DeadlineBadge
                        dueDate={a.due_date}
                        completed={a.status === "efficace"}
                      />
                    </div>
                  </TableCell>
                  <TableCell><Badge variant={STATUS_VARIANT[a.status] ?? "gray"}>{a.status}</Badge></TableCell>
                  <TableCell><Button asChild variant="ghost" size="sm"><Link href={`/actions/${a.id}`}>Apri</Link></Button></TableCell>
                </TableRow>
              ))}
              {(actions?.length ?? 0) === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
                    Nessuna azione registrata.
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
