import Link from "next/link";
import { format } from "date-fns";
import { AlertTriangle, Clock, Copy, EyeOff } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { listSuspiciousChecklists } from "@/lib/quality/fraud-detection";

const FLAG_LABEL: Record<string, string> = {
  too_fast: "Compilata troppo rapidamente",
  all_same_answer: "Tutte risposte uguali senza note",
  no_evidence_critical: "Item critici conformi senza evidenza",
  multiple_in_minute: "Multiple checklist stesso utente <2 min",
  duplicate_photo: "Foto duplicate (SHA256)",
  out_of_time_window: "Completamento fuori finestra prevista",
};

export default async function SuspiciousChecklistsPage() {
  const items = await listSuspiciousChecklists(100);

  const critici = items.filter((i: any) => i.suspicion_score >= 60).length;
  const alti = items.filter((i: any) => i.suspicion_score >= 40 && i.suspicion_score < 60).length;

  return (
    <>
      <PageHeader
        title="Compilazioni sospette"
        description={`${items.length} checklist con score sospetto >= 30 · ${critici} critiche · ${alti} attenzione`}
        actions={<Button asChild variant="outline"><Link href="/quality-sentinel">← Quality Sentinel</Link></Button>}
      />

      {/* Riepilogo flags */}
      <Card className="leo-card mb-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4 text-status-orange" /> Tipi di anomalia rilevati
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 text-xs">
            {Object.entries(FLAG_LABEL).map(([k, label]) => (
              <div key={k} className="flex items-center gap-2 rounded-md border border-leo-border bg-leo-card/40 px-2 py-1.5">
                <FlagIcon flag={k} />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="leo-card">
        <CardHeader>
          <CardTitle className="text-base">Checklist con suspicion_score &gt;= 30 ({items.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {items.length === 0 && (
            <p className="text-sm text-status-green text-center py-6">✓ Nessuna compilazione sospetta rilevata. Il sistema sta funzionando regolarmente.</p>
          )}
          {items.map((it: any) => {
            const flags: any = it.suspicion_flags ?? {};
            const activeFlags = Object.keys(flags).filter((k) => flags[k] === true);
            return (
              <Link key={it.id} href={`/quality-sentinel/checklists/${it.id}`} className="block rounded-md border border-leo-border bg-leo-card/40 px-3 py-2 hover:bg-leo-card">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs text-brand-cyan">{it.code}</span>
                      <span className="font-medium truncate">{it.title}</span>
                      <Badge variant={it.suspicion_score >= 60 ? "red" : it.suspicion_score >= 40 ? "orange" : "yellow"} className="text-[10px]">
                        score {it.suspicion_score}
                      </Badge>
                    </div>
                    <div className="mt-1 flex items-center gap-1 flex-wrap text-xs text-leo-muted">
                      {activeFlags.map((f) => (
                        <Badge key={f} variant="outline" className="text-[10px]">{FLAG_LABEL[f] ?? f}</Badge>
                      ))}
                      {it.completion_seconds != null && (
                        <span className="text-[10px]"><Clock className="inline h-3 w-3" /> {it.completion_seconds}s</span>
                      )}
                      {it.responsible && <span>· {it.responsible.first_name} {it.responsible.last_name}</span>}
                      {it.completed_at && <span>· {format(new Date(it.completed_at), "dd/MM/yyyy HH:mm")}</span>}
                    </div>
                    {flags.details && Array.isArray(flags.details) && (
                      <ul className="mt-1 ml-4 list-disc text-[10px] text-leo-muted">
                        {flags.details.map((d: string, i: number) => <li key={i}>{d}</li>)}
                      </ul>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </CardContent>
      </Card>
    </>
  );
}

function FlagIcon({ flag }: { flag: string }) {
  if (flag === "too_fast") return <Clock className="h-3 w-3 text-status-red" />;
  if (flag === "all_same_answer") return <Copy className="h-3 w-3 text-status-orange" />;
  if (flag === "no_evidence_critical") return <EyeOff className="h-3 w-3 text-status-red" />;
  if (flag === "duplicate_photo") return <Copy className="h-3 w-3 text-status-red" />;
  return <AlertTriangle className="h-3 w-3 text-status-orange" />;
}
