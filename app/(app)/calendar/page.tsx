import Link from "next/link";
import { format, addDays, differenceInDays } from "date-fns";
import { Calendar as CalendarIcon, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createServerClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";
import { getCurrentLocale } from "@/lib/i18n/dictionary";

const EVENT_TYPE_LABEL: Record<string, string> = {
  manutenzione: "Manutenzione",
  taratura: "Taratura",
  revisione: "Revisione",
  audit: "Audit",
  controllo: "Controllo",
  garanzia: "Garanzia",
  scadenza_documento: "Doc scadenza",
  scadenza_qualifica: "Qualifica",
  scadenza_certificato: "Certificato",
  altro: "Altro",
};

const PRIORITY_VARIANT: Record<string, "yellow" | "orange" | "red" | "outline"> = {
  bassa: "outline", normale: "yellow", alta: "orange", urgente: "red", critica: "red",
};

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ filter?: string; responsible?: string }> }) {
  const sp = await searchParams;
  const session = await requireSession();
  const locale = await getCurrentLocale();
  const supabase = await createServerClient();
  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);
  const in60 = addDays(today, 60).toISOString().slice(0, 10);

  let q: any = supabase
    .from("calendar_event")
    .select("*, responsible:responsible_id(first_name, last_name), project:project_id(code)")
    .gte("scheduled_date", addDays(today, -30).toISOString().slice(0, 10))
    .lte("scheduled_date", in60)
    .neq("status", "annullato")
    .order("scheduled_date");
  if (sp.filter === "mine" && session.person) q = q.eq("responsible_id", session.person.id);
  if (sp.filter === "overdue") q = q.lt("scheduled_date", todayIso).in("status", ["pianificato", "programmato", "in_corso"]);

  const { data: events } = await q;

  // Raggruppa per fasce
  const grouped: Record<string, any[]> = {
    overdue: [], today: [], thisWeek: [], next30: [], later: [],
  };
  for (const e of events ?? []) {
    const diff = differenceInDays(new Date(e.scheduled_date), today);
    if (diff < 0 && !["completato", "annullato"].includes(e.status)) grouped.overdue.push(e);
    else if (diff === 0) grouped.today.push(e);
    else if (diff <= 7) grouped.thisWeek.push(e);
    else if (diff <= 30) grouped.next30.push(e);
    else grouped.later.push(e);
  }

  return (
    <>
      <PageHeader
        title={locale === "es" ? "Calendario" : "Calendario scadenze"}
        description={locale === "es"
          ? `${events?.length ?? 0} eventos · vencidos: ${grouped.overdue.length} · hoy: ${grouped.today.length}`
          : `${events?.length ?? 0} eventi · scaduti: ${grouped.overdue.length} · oggi: ${grouped.today.length}`}
        actions={
          <div className="flex gap-2 text-xs">
            <Link href="/calendar" className={`rounded-md border border-leo-border px-3 py-1 ${!sp.filter ? "bg-leo-card" : ""}`}>Tutti</Link>
            <Link href="/calendar?filter=mine" className={`rounded-md border border-leo-border px-3 py-1 ${sp.filter === "mine" ? "bg-leo-card" : ""}`}>I miei</Link>
            <Link href="/calendar?filter=overdue" className={`rounded-md border border-status-red/30 px-3 py-1 text-status-red ${sp.filter === "overdue" ? "bg-status-red/10" : ""}`}>Scaduti</Link>
          </div>
        }
      />

      <div className="space-y-4">
        {grouped.overdue.length > 0 && (
          <Section title="🔴 Scaduti" tone="red" events={grouped.overdue} />
        )}
        {grouped.today.length > 0 && (
          <Section title="🟠 Oggi" tone="orange" events={grouped.today} />
        )}
        {grouped.thisWeek.length > 0 && (
          <Section title="🟡 Questa settimana" tone="yellow" events={grouped.thisWeek} />
        )}
        {grouped.next30.length > 0 && (
          <Section title="🔵 Prossimi 30 giorni" tone="blue" events={grouped.next30} />
        )}
        {grouped.later.length > 0 && (
          <Section title="📅 Più avanti" tone="gray" events={grouped.later} />
        )}
        {events?.length === 0 && (
          <Card className="leo-card">
            <CardContent className="p-8 text-center text-sm text-leo-muted">
              <CalendarIcon className="mx-auto mb-2 h-6 w-6" /> {locale === "es" ? "Sin eventos" : "Nessun evento"}
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}

function Section({ title, tone, events }: { title: string; tone: "red" | "orange" | "yellow" | "blue" | "gray"; events: any[] }) {
  const borderMap: Record<string, string> = {
    red: "border-status-red/40", orange: "border-status-orange/40", yellow: "border-status-yellow/40", blue: "border-brand-cyan/30", gray: "border-leo-border",
  };
  return (
    <Card className={`leo-card border-2 ${borderMap[tone]}`}>
      <CardHeader>
        <CardTitle className="text-base">{title} ({events.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {events.map((e: any) => (
          <div key={e.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-leo-border bg-leo-card/40 px-3 py-2 text-sm">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Clock className="h-3 w-3 shrink-0 text-leo-muted" />
              <span className="font-mono text-xs">{format(new Date(e.scheduled_date), "dd/MM/yyyy")}</span>
              <Badge variant="outline" className="text-[10px]">{EVENT_TYPE_LABEL[e.event_type] ?? e.event_type}</Badge>
              <span className="truncate font-medium">{e.title}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {e.project?.code && <span className="text-[10px] text-leo-muted">{e.project.code}</span>}
              {e.responsible && <span className="text-[10px] text-leo-muted">{e.responsible.first_name} {e.responsible.last_name}</span>}
              <Badge variant={PRIORITY_VARIANT[e.priority] ?? "outline"} className="text-[10px]">{e.status}</Badge>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
