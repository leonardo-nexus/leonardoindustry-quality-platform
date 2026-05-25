import Link from "next/link";
import {
  AlertTriangle,
  BadgeEuro,
  Ban,
  BarChart3,
  BriefcaseBusiness,
  ClipboardList,
  FileWarning,
  Gauge,
  Handshake,
  MessageSquareWarning,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createServerClient } from "@/lib/supabase/server";
import {
  buildCustomerCockpit,
  type CustomerAudit,
  type CustomerContract,
  type CustomerIntelligence,
  type CustomerNc,
  type CustomerProject,
} from "@/lib/quality/customer-intelligence";

const STATUS_BADGE: Record<CustomerIntelligence["status"], "green" | "blue" | "yellow" | "orange" | "red" | "black"> = {
  premium: "green",
  stabile: "blue",
  delicato: "yellow",
  problematico: "orange",
  critico: "red",
  sospeso: "black",
  blacklist: "black",
};

const RISK_BADGE: Record<CustomerIntelligence["riskLevel"], "green" | "yellow" | "orange" | "red"> = {
  basso: "green",
  medio: "yellow",
  alto: "orange",
  critico: "red",
};

function formatMoney(value: number): string {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  return new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value));
}

function scoreColor(score: number): string {
  if (score >= 90) return "#10b981";
  if (score >= 75) return "#06b6d4";
  if (score >= 60) return "#eab308";
  if (score >= 40) return "#f97316";
  return "#111827";
}

export default async function CustomersPage() {
  const supabase = await createServerClient();
  const [{ data: projects }, { data: contracts }, { data: nonConformities }, { data: audits }] = await Promise.all([
    supabase
      .from("project")
      .select("id, code, name, customer_name, status, start_date, end_date, created_at, company:company_id(name)")
      .is("active", true)
      .order("created_at", { ascending: false })
      .limit(250),
    supabase
      .from("contract")
      .select("id, code, title, client_name, value_euro, status, penalty_clauses, created_at, project_id, project:project_id(id, customer_name, code, name)")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(250),
    supabase
      .from("non_conformity")
      .select("id, code, severity, title, status, detected_at, created_at")
      .is("active", true)
      .order("detected_at", { ascending: false })
      .limit(250),
    supabase
      .from("audit")
      .select("id, code, audit_type, planned_date, executed_date, status, scope")
      .eq("audit_type", "cliente")
      .is("active", true)
      .order("planned_date", { ascending: false })
      .limit(80),
  ]);

  const customers = buildCustomerCockpit({
    projects: (projects ?? []) as unknown as CustomerProject[],
    contracts: (contracts ?? []) as unknown as CustomerContract[],
    nonConformities: (nonConformities ?? []) as unknown as CustomerNc[],
    audits: (audits ?? []) as unknown as CustomerAudit[],
  });
  const selected = customers[0];
  const criticalCount = customers.filter((customer) => customer.score < 60).length;
  const monitoredCount = customers.filter((customer) => customer.score >= 60 && customer.score < 75).length;
  const totalRevenue = customers.reduce((sum, customer) => sum + customer.totalRevenue, 0);
  const averageScore = customers.length
    ? Math.round(customers.reduce((sum, customer) => sum + customer.score, 0) / customers.length)
    : 0;

  return (
    <>
      <PageHeader
        title="Customer Experience & Reliability Cockpit"
        description="Memoria aziendale viva del cliente: margine, rischio, comportamento, contratti, stress operativo e warning direzionali."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/projects">
                <BriefcaseBusiness className="h-4 w-4" />
                Commesse
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/quality-sentinel/risk">
                <ShieldAlert className="h-4 w-4" />
                Rischio
              </Link>
            </Button>
          </div>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Kpi icon={Gauge} label="Customer score medio" value={`${averageScore}/100`} tone={averageScore < 60 ? "red" : averageScore < 75 ? "yellow" : "green"} />
        <Kpi icon={AlertTriangle} label="Clienti problematici" value={criticalCount} tone={criticalCount > 0 ? "red" : "green"} />
        <Kpi icon={MessageSquareWarning} label="Clienti da monitorare" value={monitoredCount} tone={monitoredCount > 0 ? "yellow" : "green"} />
        <Kpi icon={BadgeEuro} label="Fatturato tracciato" value={formatMoney(totalRevenue)} tone="cyan" />
        <Kpi icon={Ban} label="Blocchi commerciali" value={customers.filter((customer) => customer.score < 40).length} tone="black" />
      </div>

      {selected ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-6">
            <CustomerHero customer={selected} />
            <div className="grid gap-4 lg:grid-cols-3">
              <ScoreBreakdown customer={selected} />
              <TrendPanel customer={selected} />
              <RiskEngine customer={selected} />
            </div>
            <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
              <ReviewsPanel customer={selected} />
              <StrategyNotesPanel customer={selected} />
            </div>
            <TimelinePanel customer={selected} />
          </div>

          <aside className="space-y-4">
            <Card className="leo-card border-status-red/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileWarning className="h-4 w-4 text-status-red" />
                  Warning attivi
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {selected.warnings.length > 0 ? (
                  selected.warnings.map((warning) => (
                    <div key={warning} className="rounded-md border border-status-red/30 bg-status-red/10 p-3 text-sm text-status-red">
                      {warning}
                    </div>
                  ))
                ) : (
                  <div className="rounded-md border border-status-green/30 bg-status-green/10 p-3 text-sm text-status-green">
                    Nessun warning direzionale attivo.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="leo-card">
              <CardHeader>
                <CardTitle className="text-base">Clienti monitorati</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {customers.map((customer) => (
                  <a
                    key={customer.key}
                    href={`#${customer.key}`}
                    className="flex items-center justify-between rounded-md border border-leo-border bg-leo-card/40 px-3 py-2 text-sm hover:border-brand-cyan hover:bg-leo-card"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium">{customer.name}</div>
                      <div className="text-xs text-leo-muted">
                        {customer.projects.length} commesse · {customer.openClaims} claim · margine {customer.averageMargin}%
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="font-mono text-lg font-bold" style={{ color: scoreColor(customer.score) }}>
                        {customer.score}
                      </div>
                      <Badge variant={STATUS_BADGE[customer.status]} className="text-[10px]">
                        {customer.status}
                      </Badge>
                    </div>
                  </a>
                ))}
              </CardContent>
            </Card>
          </aside>
        </div>
      ) : (
        <Card className="leo-card">
          <CardContent className="p-8 text-center text-sm text-leo-muted">
            Nessun cliente ricostruibile dalle commesse o dai contratti. Inserisci almeno una commessa con campo cliente.
          </CardContent>
        </Card>
      )}
    </>
  );
}

function CustomerHero({ customer }: { customer: CustomerIntelligence }) {
  return (
    <Card id={customer.key} className="leo-card overflow-hidden border-brand-cyan/30">
      <CardContent className="p-0">
        <div className="grid gap-0 lg:grid-cols-[280px_minmax(0,1fr)]">
          <div className="border-b border-leo-border bg-leo-card/70 p-6 lg:border-b-0 lg:border-r">
            <div className="text-xs uppercase text-leo-muted">Customer Experience Score</div>
            <div className="mt-4 flex items-center gap-5">
              <ScoreRing score={customer.score} />
              <div>
                <Badge variant={STATUS_BADGE[customer.status]}>{customer.className}</Badge>
                <div className="mt-3 text-sm text-leo-muted">Stato relazione</div>
                <div className="text-xl font-semibold capitalize">{customer.status}</div>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-semibold text-white">{customer.name}</h2>
                <p className="mt-1 text-sm text-leo-muted">
                  {customer.projects.length} commesse · {customer.contracts.length} contratti · {customer.timeline.length} eventi intelligence
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant={RISK_BADGE[customer.riskLevel]}>Rischio {customer.riskLevel}</Badge>
                <Badge variant={customer.trend === "miglioramento" ? "green" : customer.trend === "peggioramento" ? "red" : "yellow"}>
                  Trend {customer.trend}
                </Badge>
              </div>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Metric label="Affidabilita pagamenti" value={`${customer.paymentReliability}/100`} />
              <Metric label="Stress operativo" value={`${customer.operationalStress}/100`} danger />
              <Metric label="Dispute" value={customer.disputes} danger={customer.disputes > 0} />
              <Metric label="Claim aperti" value={customer.openClaims} danger={customer.openClaims > 0} />
              <Metric label="Marginalita media" value={`${customer.averageMargin}%`} danger={customer.averageMargin < 8} />
              <Metric label="Utile reale stimato" value={formatMoney(customer.realProfit)} danger={customer.realProfit < 0} />
              <Metric label="Giorni pagamento" value={customer.paymentDaysAverage} danger={customer.paymentDaysAverage > 60} />
              <Metric label="Tempo approvazioni" value={`${customer.approvalDaysAverage} gg`} danger={customer.approvalDaysAverage > 15} />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ScoreRing({ score }: { score: number }) {
  const color = scoreColor(score);
  return (
    <div
      className="grid h-32 w-32 place-items-center rounded-full"
      style={{ background: `conic-gradient(${color} ${score * 3.6}deg, rgba(148,163,184,.25) 0deg)` }}
    >
      <div className="grid h-24 w-24 place-items-center rounded-full bg-leo-bg">
        <div className="text-center">
          <div className="font-mono text-4xl font-bold text-white">{score}</div>
          <div className="text-xs text-leo-muted">/100</div>
        </div>
      </div>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, tone }: { icon: LucideIcon; label: string; value: string | number; tone: "green" | "yellow" | "red" | "cyan" | "black" }) {
  const toneClass: Record<typeof tone, string> = {
    green: "border-status-green/40 text-status-green",
    yellow: "border-status-yellow/40 text-status-yellow",
    red: "border-status-red/40 text-status-red",
    cyan: "border-brand-cyan/40 text-brand-cyan",
    black: "border-zinc-600 text-zinc-200",
  };
  return (
    <Card className={`leo-card ${toneClass[tone]}`}>
      <CardContent className="flex items-center gap-3 p-4">
        <Icon className="h-5 w-5 shrink-0" />
        <div className="min-w-0">
          <div className="truncate text-2xl font-semibold text-white">{value}</div>
          <div className="text-xs text-leo-muted">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value, danger = false }: { label: string; value: string | number; danger?: boolean }) {
  return (
    <div className={`rounded-md border p-3 ${danger ? "border-status-orange/40 bg-status-orange/5" : "border-leo-border bg-leo-card/40"}`}>
      <div className="text-xs text-leo-muted">{label}</div>
      <div className={`mt-1 text-xl font-semibold ${danger ? "text-status-orange" : "text-white"}`}>{value}</div>
    </div>
  );
}

function ScoreBreakdown({ customer }: { customer: CustomerIntelligence }) {
  return (
    <Card className="leo-card lg:col-span-1">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-4 w-4 text-brand-cyan" />
          Componenti score
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {customer.scoreAreas.map((area) => (
          <div key={area.area}>
            <div className="mb-1 flex justify-between text-xs">
              <span>{area.area}</span>
              <span className="text-leo-muted">{area.score}/100 · peso {area.weight}%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-700">
              <div className="h-2 rounded-full" style={{ width: `${area.score}%`, backgroundColor: scoreColor(area.score) }} />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function TrendPanel({ customer }: { customer: CustomerIntelligence }) {
  return (
    <Card className="leo-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {customer.trend === "peggioramento" ? <TrendingDown className="h-4 w-4 text-status-red" /> : <TrendingUp className="h-4 w-4 text-status-green" />}
          Trend cliente
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex h-36 items-end gap-3">
          {customer.history.map((point) => (
            <div key={point.period} className="flex flex-1 flex-col items-center gap-2">
              <div className="text-xs font-semibold" style={{ color: scoreColor(point.score) }}>
                {point.score}
              </div>
              <div className="w-full rounded-t bg-brand-cyan/70" style={{ height: `${Math.max(16, point.score)}%` }} />
              <div className="text-xs text-leo-muted">{point.period}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function RiskEngine({ customer }: { customer: CustomerIntelligence }) {
  const block = customer.score < 40;
  const approval = customer.score < 60;
  return (
    <Card className={`leo-card ${block ? "border-zinc-500" : approval ? "border-status-red/40" : "border-status-green/30"}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldAlert className={`h-4 w-4 ${block || approval ? "text-status-red" : "text-status-green"}`} />
          Customer Risk Engine
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-center justify-between rounded-md border border-leo-border bg-leo-card/40 px-3 py-2">
          <span>Nuove commesse</span>
          <Badge variant={block ? "black" : approval ? "red" : "green"}>{block ? "Blocco" : approval ? "Approvazione" : "Libere"}</Badge>
        </div>
        <div className="flex items-center justify-between rounded-md border border-leo-border bg-leo-card/40 px-3 py-2">
          <span>Credito cliente</span>
          <Badge variant={customer.paymentDaysAverage > 75 ? "red" : customer.paymentDaysAverage > 45 ? "yellow" : "green"}>
            {customer.paymentDaysAverage > 75 ? "da bloccare" : customer.paymentDaysAverage > 45 ? "monitorato" : "ok"}
          </Badge>
        </div>
        <div className="flex items-center justify-between rounded-md border border-leo-border bg-leo-card/40 px-3 py-2">
          <span>Escalation generate</span>
          <span className="font-mono text-lg">{customer.escalations}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function ReviewsPanel({ customer }: { customer: CustomerIntelligence }) {
  return (
    <Card className="leo-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-4 w-4 text-brand-cyan" />
          Esperienze sul cliente
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {customer.reviews.map((review) => (
          <div key={`${review.date}-${review.comment}`} className="rounded-md border border-leo-border bg-leo-card/40 p-3">
            <div className="flex flex-wrap justify-between gap-2 text-xs text-leo-muted">
              <span>{formatDate(review.date)} · {review.author}</span>
              <span>{review.project}</span>
            </div>
            <p className="mt-2 text-sm text-white">{review.comment}</p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-xs sm:grid-cols-5">
              <MiniScore label="Pag." value={review.payment} />
              <MiniScore label="Org." value={review.organization} />
              <MiniScore label="Coll." value={review.collaboration} />
              <MiniScore label="Press." value={review.pressure} inverse />
              <MiniScore label="Claim" value={review.claimRisk} inverse />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function MiniScore({ label, value, inverse = false }: { label: string; value: number; inverse?: boolean }) {
  const normalized = inverse ? 11 - value : value;
  return (
    <div className="rounded border border-leo-border bg-leo-bg/50 px-2 py-1">
      <div className="text-leo-muted">{label}</div>
      <div className="font-mono font-semibold" style={{ color: scoreColor(normalized * 10) }}>{value}/10</div>
    </div>
  );
}

function StrategyNotesPanel({ customer }: { customer: CustomerIntelligence }) {
  return (
    <Card className="leo-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardList className="h-4 w-4 text-brand-cyan" />
          Note Strategiche Cliente
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {customer.notes.map((note) => (
          <div key={`${note.date}-${note.title}`} className="rounded-md border border-leo-border bg-leo-card/40 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-medium">{note.title}</div>
              <Badge variant={note.severity === "black" ? "black" : note.severity}>{note.author}</Badge>
            </div>
            <p className="mt-2 text-sm text-leo-muted">{note.note}</p>
            <div className="mt-2 text-xs text-leo-muted">Audit trail: {formatDate(note.date)}</div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function TimelinePanel({ customer }: { customer: CustomerIntelligence }) {
  return (
    <Card className="leo-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Handshake className="h-4 w-4 text-brand-cyan" />
          Feed live cliente
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2">
        {customer.timeline.slice(0, 8).map((event) => (
          <div key={`${event.date}-${event.title}`} className="rounded-md border border-leo-border bg-leo-card/40 p-3">
            <div className="flex items-center justify-between gap-2">
              <Badge variant={event.type === "warning" ? "red" : event.type === "contratto" ? "yellow" : "blue"}>{event.type}</Badge>
              <span className="text-xs text-leo-muted">{formatDate(event.date)}</span>
            </div>
            <div className="mt-2 font-medium">{event.title}</div>
            <div className="mt-1 text-sm text-leo-muted">{event.description}</div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
