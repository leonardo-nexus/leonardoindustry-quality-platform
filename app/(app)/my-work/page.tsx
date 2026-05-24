import Link from "next/link";
import { format } from "date-fns";
import { CheckCircle2, AlertTriangle, Clock, ClipboardList, FileSignature, Lock, Inbox, Wrench } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createServerClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";
import { getCurrentLocale } from "@/lib/i18n/dictionary";

const PRIORITY_VARIANT: Record<string, "yellow" | "orange" | "red"> = {
  bassa: "yellow", normale: "yellow", alta: "orange", urgente: "red", critica: "red",
};

const TYPE_ICON: Record<string, any> = {
  task: Wrench, checklist: ClipboardList, request: Inbox, block: Lock,
  review: ClipboardList, signature: FileSignature, correction: AlertTriangle,
  reception: Inbox, approval: CheckCircle2, audit: ClipboardList,
};

export default async function MyWorkPage() {
  const session = await requireSession();
  const locale = await getCurrentLocale();
  if (!session.person) {
    return <div className="p-6">Profilo persona mancante</div>;
  }

  const supabase = await createServerClient();
  const today = new Date().toISOString().slice(0, 10);

  // Carica assignments (oggi/scaduti/upcoming)
  const { data: assignments } = await supabase
    .from("user_assignment")
    .select("*, project:project_id(code, name)")
    .eq("assigned_to_person_id", session.person.id)
    .not("status", "in", "(completata,riassegnata,rifiutata)")
    .order("priority", { ascending: false })
    .order("due_date", { ascending: true });

  // Checklist assegnate dirette via responsible_id
  const { data: myChecklists } = await supabase
    .from("quality_checklist")
    .select("id, code, title, status, due_date")
    .eq("responsible_id", session.person.id)
    .not("status", "in", "(completata,non_conforme)")
    .eq("active", true)
    .order("due_date", { ascending: true })
    .limit(20);

  // Richieste ricevute (se la persona è recipient)
  const { data: myRequests } = await supabase
    .from("quality_request")
    .select("id, subject, status, due_date")
    .eq("recipient_person_id", session.person.id)
    .in("status", ["inviata", "sollecitata"])
    .order("due_date", { ascending: true })
    .limit(20);

  // NC dove sono responsabile
  const { data: myNc } = await supabase
    .from("non_conformity")
    .select("id, code, title, severity, status")
    .eq("responsible_id", session.person.id)
    .neq("status", "chiusa")
    .order("severity", { ascending: false })
    .limit(20);

  // Azioni correttive assegnate
  const { data: myActions } = await supabase
    .from("corrective_action")
    .select("id, title, status, due_date")
    .eq("responsible_id", session.person.id)
    .neq("status", "verificata")
    .neq("status", "efficace")
    .order("due_date", { ascending: true })
    .limit(20);

  const today_tasks = (assignments ?? []).filter((a: any) => a.due_date === today);
  const overdue = (assignments ?? []).filter((a: any) => a.due_date && a.due_date < today);
  const upcoming = (assignments ?? []).filter((a: any) => !a.due_date || a.due_date > today);

  const totalToday = today_tasks.length + (myChecklists ?? []).filter((c: any) => c.due_date === today).length;
  const totalOverdue = overdue.length + (myChecklists ?? []).filter((c: any) => c.due_date && c.due_date < today).length + (myRequests ?? []).filter((r: any) => r.due_date && r.due_date < today).length;

  return (
    <>
      <PageHeader
        title={locale === "es" ? `Mi trabajo, ${session.person.first_name}` : `Il mio lavoro, ${session.person.first_name}`}
        description={locale === "es" ? "Pocas tareas, claras y de tu competencia." : "Pochi compiti, chiari e di tua competenza."}
      />

      {/* KPI sintetici */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <KpiCard label={locale === "es" ? "Hoy" : "Oggi"} value={totalToday} color="text-status-orange" icon={Clock} />
        <KpiCard label={locale === "es" ? "Vencidos" : "Scaduti"} value={totalOverdue} color="text-status-red" icon={AlertTriangle} />
        <KpiCard label="Checklist" value={(myChecklists ?? []).length} color="text-brand-cyan" icon={ClipboardList} />
        <KpiCard label={locale === "es" ? "Solicitudes" : "Richieste"} value={(myRequests ?? []).length} color="text-brand-green" icon={Inbox} />
        <KpiCard label="NC" value={(myNc ?? []).length} color="text-status-red" icon={AlertTriangle} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Oggi */}
        <Card className="leo-card border-status-orange/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4 text-status-orange" /> {locale === "es" ? "Hoy" : "Oggi"} ({today_tasks.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {today_tasks.length === 0 && (myChecklists ?? []).filter((c: any) => c.due_date === today).length === 0 && (
              <p className="text-sm text-status-green">✓ {locale === "es" ? "Nada para hoy" : "Niente per oggi"}</p>
            )}
            {today_tasks.map((a: any) => <AssignmentRow key={a.id} a={a} />)}
            {(myChecklists ?? []).filter((c: any) => c.due_date === today).map((c: any) => (
              <Link key={c.id} href={`/quality-sentinel/checklists/${c.id}`} className="flex items-center justify-between rounded-md border border-status-orange/30 bg-status-orange/5 px-3 py-2 text-sm hover:bg-status-orange/10">
                <div className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-status-orange" />
                  <span className="font-mono text-xs">{c.code}</span>
                  <span>{c.title}</span>
                </div>
                <Badge variant="orange">{locale === "es" ? "Hoy" : "Oggi"}</Badge>
              </Link>
            ))}
          </CardContent>
        </Card>

        {/* Scaduti */}
        <Card className="leo-card border-status-red/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-status-red" /> {locale === "es" ? "Vencidos" : "Scaduti"} ({overdue.length + (myChecklists ?? []).filter((c: any) => c.due_date && c.due_date < today).length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {overdue.length === 0 && (myChecklists ?? []).filter((c: any) => c.due_date && c.due_date < today).length === 0 && (
              <p className="text-sm text-status-green">✓ {locale === "es" ? "Sin vencidos" : "Nessuno scaduto"}</p>
            )}
            {overdue.map((a: any) => <AssignmentRow key={a.id} a={a} />)}
            {(myChecklists ?? []).filter((c: any) => c.due_date && c.due_date < today).map((c: any) => (
              <Link key={c.id} href={`/quality-sentinel/checklists/${c.id}`} className="flex items-center justify-between rounded-md border border-status-red/30 bg-status-red/5 px-3 py-2 text-sm hover:bg-status-red/10">
                <div className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-status-red" />
                  <span className="font-mono text-xs">{c.code}</span>
                  <span>{c.title}</span>
                </div>
                <Badge variant="red">{locale === "es" ? "Vencida" : "Scaduta"} {c.due_date && format(new Date(c.due_date), "dd/MM")}</Badge>
              </Link>
            ))}
          </CardContent>
        </Card>

        {/* Richieste */}
        <Card className="leo-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Inbox className="h-4 w-4 text-brand-green" /> {locale === "es" ? "Solicitudes recibidas" : "Richieste ricevute"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {(myRequests?.length ?? 0) === 0 && <p className="text-xs text-leo-muted">{locale === "es" ? "Sin solicitudes" : "Nessuna richiesta"}</p>}
            {(myRequests ?? []).map((r: any) => (
              <Link key={r.id} href="/quality-sentinel" className="flex items-center justify-between rounded-md border border-leo-border bg-leo-card/40 px-3 py-2 text-xs hover:bg-leo-card">
                <span className="font-medium">{r.subject}</span>
                {r.due_date && <Badge variant={r.due_date < today ? "red" : "yellow"}>{format(new Date(r.due_date), "dd/MM")}</Badge>}
              </Link>
            ))}
          </CardContent>
        </Card>

        {/* NC */}
        <Card className="leo-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><AlertTriangle className="h-4 w-4 text-status-red" /> {locale === "es" ? "NCs como responsable" : "NC come responsabile"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {(myNc?.length ?? 0) === 0 && <p className="text-xs text-leo-muted">{locale === "es" ? "Sin NCs" : "Nessuna NC"}</p>}
            {(myNc ?? []).map((nc: any) => (
              <Link key={nc.id} href={`/non-conformities/${nc.id}`} className="flex items-center justify-between rounded-md border border-leo-border bg-leo-card/40 px-3 py-2 text-xs hover:bg-leo-card">
                <div>
                  <Badge variant={nc.severity === "critica" ? "red" : nc.severity === "maggiore" ? "orange" : "yellow"} className="text-[10px] mr-2">{nc.severity}</Badge>
                  <span className="font-medium">{nc.title}</span>
                </div>
                <Badge variant="outline">{nc.status}</Badge>
              </Link>
            ))}
          </CardContent>
        </Card>

        {/* Azioni correttive */}
        <Card className="leo-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Wrench className="h-4 w-4 text-brand-cyan" /> {locale === "es" ? "Acciones correctivas asignadas" : "Azioni correttive assegnate"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {(myActions?.length ?? 0) === 0 && <p className="text-xs text-leo-muted">{locale === "es" ? "Sin acciones" : "Nessuna azione"}</p>}
            {(myActions ?? []).map((a: any) => (
              <Link key={a.id} href={`/actions/${a.id}`} className="flex items-center justify-between rounded-md border border-leo-border bg-leo-card/40 px-3 py-2 text-xs hover:bg-leo-card">
                <span className="font-medium">{a.title}</span>
                <div className="flex items-center gap-2">
                  {a.due_date && <span className="text-leo-muted">{format(new Date(a.due_date), "dd/MM")}</span>}
                  <Badge variant="outline">{a.status}</Badge>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        {/* Prossime */}
        {upcoming.length > 0 && (
          <Card className="leo-card lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">{locale === "es" ? "Próximas" : "Prossime"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {upcoming.slice(0, 10).map((a: any) => <AssignmentRow key={a.id} a={a} />)}
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}

function KpiCard({ label, value, color, icon: Icon }: { label: string; value: number; color: string; icon: any }) {
  return (
    <Card className="leo-card">
      <CardContent className="p-4 text-center">
        <Icon className={`mx-auto mb-1 h-5 w-5 ${color}`} />
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-xs text-leo-muted">{label}</div>
      </CardContent>
    </Card>
  );
}

function AssignmentRow({ a }: { a: any }) {
  const Icon = TYPE_ICON[a.assignment_type] ?? CheckCircle2;
  const variant = PRIORITY_VARIANT[a.priority] ?? "yellow";
  return (
    <div className="flex items-center justify-between rounded-md border border-leo-border bg-leo-card/40 px-3 py-2 text-sm">
      <div className="flex items-center gap-2 min-w-0">
        <Icon className="h-4 w-4 shrink-0 text-leo-muted" />
        <Badge variant="outline" className="text-[10px]">{a.assignment_type}</Badge>
        <span className="truncate">{a.entity_type}</span>
        {a.project && <span className="text-xs text-leo-muted">· {a.project.code}</span>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {a.due_date && <span className="text-[10px] text-leo-muted">{format(new Date(a.due_date), "dd/MM")}</span>}
        <Badge variant={variant} className="text-[10px]">{a.priority}</Badge>
      </div>
    </div>
  );
}
