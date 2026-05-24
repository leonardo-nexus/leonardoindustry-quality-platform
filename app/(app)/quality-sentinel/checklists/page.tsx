import Link from "next/link";
import { format } from "date-fns";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DeadlineBadge } from "@/components/status/deadline-badge";
import { createServerClient } from "@/lib/supabase/server";

const STATUS_VARIANT: Record<string, "gray" | "yellow" | "red" | "green"> = {
  non_avviata: "gray",
  in_corso: "yellow",
  bloccata: "red",
  completata: "green",
  scaduta: "red",
  non_conforme: "red",
};

export default async function ChecklistsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const params = await searchParams;
  const supabase = await createServerClient();
  let query = supabase
    .from("quality_checklist")
    .select("id, code, title, status, due_date, signature_required, responsible:responsible_id(first_name,last_name), phase:plan_phase_id(name, plan:plan_id(project:project_id(code, name, company:company_id(name))))")
    .eq("active", true)
    .order("due_date", { ascending: true })
    .limit(200);
  if (params.status) query = query.eq("status", params.status);
  const { data: checklists } = await query;

  return (
    <>
      <PageHeader
        title="Checklist qualità"
        description="Catena di controlli obbligatori — ogni checklist può bloccare la fase se mancano allegati o firme"
      />
      <div className="mb-4 flex gap-2 text-sm">
        <Link className="rounded-md border border-leo-border px-3 py-1 hover:bg-leo-card" href="/quality-sentinel/checklists">Tutte</Link>
        <Link className="rounded-md border border-leo-border px-3 py-1 hover:bg-leo-card" href="/quality-sentinel/checklists?status=non_avviata">Da iniziare</Link>
        <Link className="rounded-md border border-leo-border px-3 py-1 hover:bg-leo-card" href="/quality-sentinel/checklists?status=in_corso">In corso</Link>
        <Link className="rounded-md border border-leo-border px-3 py-1 hover:bg-leo-card" href="/quality-sentinel/checklists?status=scaduta">Scadute</Link>
        <Link className="rounded-md border border-leo-border px-3 py-1 hover:bg-leo-card" href="/quality-sentinel/checklists?status=non_conforme">Non conformi</Link>
        <Link className="rounded-md border border-leo-border px-3 py-1 hover:bg-leo-card" href="/quality-sentinel/checklists?status=completata">Completate</Link>
      </div>
      <Card className="leo-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Codice</TableHead>
                <TableHead>Titolo</TableHead>
                <TableHead>Commessa</TableHead>
                <TableHead>Fase</TableHead>
                <TableHead>Responsabile</TableHead>
                <TableHead>Scadenza</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(checklists ?? []).map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono text-xs text-brand-cyan">{c.code}</TableCell>
                  <TableCell>{c.title}{c.signature_required && <span title="Firma richiesta" className="ml-2 text-status-orange">✍️</span>}</TableCell>
                  <TableCell className="text-xs">{c.phase?.plan?.project?.code}</TableCell>
                  <TableCell className="text-xs">{c.phase?.name}</TableCell>
                  <TableCell className="text-xs">{c.responsible ? `${c.responsible.first_name} ${c.responsible.last_name}` : "—"}</TableCell>
                  <TableCell>{c.due_date ? <DeadlineBadge dueDate={c.due_date} completed={c.status === "completata"} /> : "—"}</TableCell>
                  <TableCell><Badge variant={STATUS_VARIANT[c.status] ?? "gray"}>{c.status.replace(/_/g, " ")}</Badge></TableCell>
                  <TableCell>
                    <Link href={`/quality-sentinel/checklists/${c.id}`} className="text-xs text-brand-cyan hover:underline">Apri</Link>
                  </TableCell>
                </TableRow>
              ))}
              {(checklists?.length ?? 0) === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-sm text-leo-muted py-8">
                    Nessuna checklist trovata. Genera un piano qualità da una commessa per crearne.
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
