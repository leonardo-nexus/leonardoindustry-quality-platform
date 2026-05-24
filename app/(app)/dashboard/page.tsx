import Link from "next/link";
import { format, formatDistanceToNowStrict } from "date-fns";
import { it } from "date-fns/locale";
import {
  Building2,
  AlertTriangle,
  ClipboardCheck,
  FileText,
  Flame,
  Wrench,
  Hammer,
  CalendarClock,
  ArrowUpRight,
  ShieldAlert,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createServerClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

interface KpiProps {
  label: string;
  value: number | string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "neutral" | "info" | "warning" | "danger" | "ok";
  href?: string;
}

const TONE_CLASS: Record<NonNullable<KpiProps["tone"]>, { card: string; icon: string; value: string }> = {
  neutral: { card: "border-leo-border bg-leo-card/40", icon: "text-leo-muted", value: "text-leo-text" },
  info: { card: "border-brand-cyan/40 bg-brand-cyan/5", icon: "text-brand-cyan", value: "text-brand-cyan" },
  ok: { card: "border-status-green/40 bg-status-green/5", icon: "text-status-green", value: "text-status-green" },
  warning: { card: "border-status-orange/40 bg-status-orange/5", icon: "text-status-orange", value: "text-status-orange" },
  danger: { card: "border-status-red/40 bg-status-red/5", icon: "text-status-red", value: "text-status-red" },
};

function Kpi({ label, value, hint, icon: Icon, tone = "neutral", href }: KpiProps) {
  const t = TONE_CLASS[tone];
  const body = (
    <Card className={cn("backdrop-blur-sm transition-all hover:scale-[1.02] hover:shadow-xl", t.card)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-medium uppercase tracking-wider text-leo-muted">
          {label}
        </CardTitle>
        <div className="flex items-center gap-1">
          <Icon className={cn("h-4 w-4", t.icon)} />
          {href && <ArrowUpRight className="h-3 w-3 text-leo-muted opacity-0 transition-opacity group-hover:opacity-100" />}
        </div>
      </CardHeader>
      <CardContent>
        <div className={cn("text-3xl font-bold", t.value)}>{value}</div>
        {hint && <p className="mt-1 text-xs text-leo-muted">{hint}</p>}
      </CardContent>
    </Card>
  );
  return href ? <Link href={href} className="group block">{body}</Link> : body;
}

export default async function DashboardPage() {
  const supabase = await createServerClient();
  const today = new Date();
  const in7 = new Date(today); in7.setDate(today.getDate() + 7);
  const in30 = new Date(today); in30.setDate(today.getDate() + 30);
  const ago30 = new Date(today); ago30.setDate(today.getDate() - 30);
  const isoToday = today.toISOString().slice(0, 10);
  const iso7 = in7.toISOString().slice(0, 10);
  const iso30 = in30.toISOString().slice(0, 10);
  const isoAgo30 = ago30.toISOString().slice(0, 10);

  // ====== KPI counts ======
  const [
    { count: companiesCount },
    { count: openProjects },
    { count: openNc },
    { count: ncAged },
    { count: plannedAudits },
    { count: tasksOverdue },
    { count: tasksSoon },
    { count: docsToReview },
    { count: docsObsolete },
    { count: welderExpired },
    { count: welderExpiring },
    { count: assetExpiring },
    { count: assetOutOfService },
  ] = await Promise.all([
    supabase.from("company").select("id", { count: "exact", head: true }).eq("active", true),
    supabase.from("project").select("id", { count: "exact", head: true }).in("status", ["aperta", "in_corso"]),
    supabase.from("non_conformity").select("id", { count: "exact", head: true }).neq("status", "chiusa").eq("active", true),
    supabase.from("non_conformity").select("id", { count: "exact", head: true }).neq("status", "chiusa").lt("detected_at", isoAgo30).eq("active", true),
    supabase.from("audit").select("id", { count: "exact", head: true }).eq("status", "pianificato").gte("planned_date", isoToday).lte("planned_date", iso7),
    supabase.from("task").select("id", { count: "exact", head: true }).lt("due_date", isoToday).neq("status", "chiusa").neq("status", "verificata"),
    supabase.from("task").select("id", { count: "exact", head: true }).gte("due_date", isoToday).lte("due_date", iso7).neq("status", "chiusa"),
    supabase.from("document_revision").select("id", { count: "exact", head: true }).lte("next_review_date", iso30).eq("is_current", true),
    supabase.from("document").select("id", { count: "exact", head: true }).eq("status", "obsoleto").eq("active", true),
    supabase.from("welder_qualification").select("id", { count: "exact", head: true }).lt("expiry_date", isoToday).eq("status", "valida"),
    supabase.from("welder_qualification").select("id", { count: "exact", head: true }).gte("expiry_date", isoToday).lte("expiry_date", iso30).eq("status", "valida"),
    supabase.from("asset_event").select("id", { count: "exact", head: true }).lte("next_due_date", iso30),
    supabase.from("asset").select("id", { count: "exact", head: true }).eq("status", "fuori_servizio").eq("active", true),
  ]);

  // ====== Azioni urgenti — liste reali ======
  const [
    { data: urgentTasks },
    { data: urgentNc },
    { data: urgentActions },
    { data: urgentAudits },
  ] = await Promise.all([
    supabase.from("task")
      .select("id, title, due_date, priority, company:company_id(name), responsible:responsible_id(first_name, last_name)")
      .lt("due_date", isoToday).neq("status", "chiusa").neq("status", "verificata")
      .order("due_date").limit(5),
    supabase.from("non_conformity")
      .select("id, title, severity, detected_at, company:company_id(name)")
      .neq("status", "chiusa").eq("active", true)
      .order("detected_at").limit(5),
    supabase.from("corrective_action")
      .select("id, title, due_date, status, responsible:responsible_id(first_name, last_name)")
      .lte("due_date", iso7).not("status", "in", "(efficace,non_efficace)")
      .order("due_date").limit(5),
    supabase.from("audit")
      .select("id, code, audit_type, planned_date, company:company_id(name)")
      .eq("status", "pianificato").gte("planned_date", isoToday).lte("planned_date", iso7)
      .order("planned_date").limit(5),
  ]);

  // ====== Blocchi operativi ======
  const [
    { data: blockedWelders },
    { data: blockedWps },
    { data: blockedAssets },
    { data: blockedMaterials },
  ] = await Promise.all([
    supabase.from("welder_qualification")
      .select("id, certificate_code, expiry_date, person:person_id(first_name, last_name), welding_process:welding_process_id(code)")
      .lt("expiry_date", isoToday).eq("status", "valida").limit(5),
    supabase.from("wps")
      .select("id, code, revision, company:company_id(name)")
      .eq("status", "valida").limit(50),
    supabase.from("asset")
      .select("id, code, asset_type, company:company_id(name)")
      .eq("status", "fuori_servizio").eq("active", true).limit(5),
    supabase.from("material_lot")
      .select("id, material_grade, heat_number, status, company:company_id(name)")
      .in("status", ["bloccato", "non_conforme"]).eq("active", true).limit(5),
  ]);

  // WPS senza WPQR valida (computed)
  const wpsWithoutWpqr: typeof blockedWps = [];
  if (blockedWps && blockedWps.length > 0) {
    const wpsIds = blockedWps.map((w) => w.id);
    const { data: validWpqr } = await supabase
      .from("wpqr")
      .select("wps_id")
      .in("wps_id", wpsIds)
      .eq("status", "valida");
    const wpsWithWpqr = new Set((validWpqr ?? []).map((w) => w.wps_id));
    wpsWithoutWpqr.push(...blockedWps.filter((w) => !wpsWithWpqr.has(w.id)).slice(0, 5));
  }

  // ====== Stato Norme ======
  const { data: standards } = await supabase
    .from("standard")
    .select("id, code, version, title")
    .order("code")
    .limit(4);

  const standardsStats = await Promise.all(
    (standards ?? []).map(async (s) => {
      const [
        { count: requirements },
        { count: covered },
      ] = await Promise.all([
        supabase.from("standard_requirement").select("id", { count: "exact", head: true }).eq("standard_id", s.id),
        supabase
          .from("process_requirement")
          .select("id, requirement:requirement_id!inner(standard_id)", { count: "exact", head: true })
          .eq("requirement.standard_id", s.id)
          .eq("applicability", "applicabile"),
      ]);
      return { ...s, requirements: requirements ?? 0, covered: covered ?? 0 };
    }),
  );

  return (
    <>
      <PageHeader
        title="Dashboard gruppo"
        description="Cruscotto operativo del sistema integrato qualità · 9 imprese del gruppo Leonardoindustry"
      />

      {/* ====== KPI ====== */}
      <section className="mb-8">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-leo-muted">
          Indicatori principali
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi label="Imprese attive" value={companiesCount ?? 0} icon={Building2} tone="info" href="/companies" />
          <Kpi label="Commesse aperte" value={openProjects ?? 0} icon={Hammer} href="/projects" />
          <Kpi
            label="NC aperte"
            value={openNc ?? 0}
            icon={AlertTriangle}
            tone={(openNc ?? 0) > 0 ? "warning" : "ok"}
            hint={(ncAged ?? 0) > 0 ? `${ncAged} aperte da oltre 30 gg` : undefined}
            href="/non-conformities"
          />
          <Kpi label="Audit settimana" value={plannedAudits ?? 0} icon={ClipboardCheck} href="/audits" />

          <Kpi
            label="Scadenze scadute"
            value={tasksOverdue ?? 0}
            icon={CalendarClock}
            tone={(tasksOverdue ?? 0) > 0 ? "danger" : "ok"}
            hint="Task oltre la data"
            href="/deadlines?status=scaduta"
          />
          <Kpi
            label="Scadenze 7 gg"
            value={tasksSoon ?? 0}
            icon={CalendarClock}
            tone={(tasksSoon ?? 0) > 0 ? "warning" : "neutral"}
            href="/deadlines"
          />
          <Kpi
            label="Documenti da revisionare"
            value={docsToReview ?? 0}
            icon={FileText}
            tone={(docsToReview ?? 0) > 0 ? "warning" : "neutral"}
            hint={(docsObsolete ?? 0) > 0 ? `${docsObsolete} obsoleti attivi` : "Entro 30 gg"}
            href="/documents"
          />
          <Kpi
            label="Qualifiche saldatori"
            value={(welderExpired ?? 0) + (welderExpiring ?? 0)}
            icon={Flame}
            tone={(welderExpired ?? 0) > 0 ? "danger" : (welderExpiring ?? 0) > 0 ? "warning" : "ok"}
            hint={
              (welderExpired ?? 0) > 0
                ? `${welderExpired} scadute · ${welderExpiring} in scadenza`
                : `${welderExpiring} in scadenza 30 gg`
            }
            href="/welding/welders"
          />

          <Kpi
            label="Tarature in scadenza"
            value={assetExpiring ?? 0}
            icon={Wrench}
            tone={(assetExpiring ?? 0) > 0 ? "warning" : "neutral"}
            hint={(assetOutOfService ?? 0) > 0 ? `${assetOutOfService} asset fuori servizio` : "Entro 30 gg"}
            href="/assets"
          />
        </div>
      </section>

      {/* ====== Azioni urgenti + Blocchi operativi ====== */}
      <section className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Azioni urgenti */}
        <Card className="leo-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldAlert className="h-4 w-4 text-status-orange" />
              Azioni urgenti
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Task scaduti */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-leo-muted">Scadenze oltre data</h3>
                {(tasksOverdue ?? 0) > (urgentTasks?.length ?? 0) && (
                  <Link href="/deadlines?status=scaduta" className="text-xs text-brand-cyan hover:underline">
                    +{(tasksOverdue ?? 0) - (urgentTasks?.length ?? 0)} altre →
                  </Link>
                )}
              </div>
              {(urgentTasks?.length ?? 0) === 0 ? (
                <p className="flex items-center gap-2 text-xs text-status-green">
                  <CheckCircle2 className="h-3 w-3" /> Nessuna scadenza oltre data
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {(urgentTasks ?? []).map((t: any) => (
                    <li key={t.id}>
                      <Link
                        href={`/deadlines`}
                        className="flex items-center justify-between rounded-md bg-status-red/10 px-3 py-2 text-sm hover:bg-status-red/20"
                      >
                        <span className="truncate">
                          <span className="text-status-red font-medium">{t.title}</span>
                          <span className="ml-2 text-xs text-leo-muted">
                            {t.company?.name} · {t.responsible ? `${t.responsible.first_name} ${t.responsible.last_name}` : "—"}
                          </span>
                        </span>
                        <span className="text-xs text-status-red shrink-0 ml-2">
                          {formatDistanceToNowStrict(new Date(t.due_date), { locale: it, addSuffix: false })} fa
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* NC aperte */}
            {(urgentNc?.length ?? 0) > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-leo-muted">NC aperte da più tempo</h3>
                <ul className="space-y-1.5">
                  {(urgentNc ?? []).map((nc: any) => (
                    <li key={nc.id}>
                      <Link
                        href={`/non-conformities/${nc.id}`}
                        className="flex items-center justify-between rounded-md bg-leo-card/40 px-3 py-2 text-sm hover:bg-leo-card"
                      >
                        <span className="truncate">
                          <Badge variant={nc.severity === "critica" ? "red" : nc.severity === "maggiore" ? "orange" : "yellow"} className="mr-2">
                            {nc.severity}
                          </Badge>
                          <span className="font-medium">{nc.title}</span>
                          <span className="ml-2 text-xs text-leo-muted">{nc.company?.name}</span>
                        </span>
                        <span className="text-xs text-leo-muted shrink-0 ml-2">
                          {format(new Date(nc.detected_at), "dd/MM/yy")}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Audit settimana */}
            {(urgentAudits?.length ?? 0) > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-leo-muted">Audit questa settimana</h3>
                <ul className="space-y-1.5">
                  {(urgentAudits ?? []).map((a: any) => (
                    <li key={a.id}>
                      <Link
                        href={`/audits/${a.id}`}
                        className="flex items-center justify-between rounded-md bg-brand-cyan/10 px-3 py-2 text-sm hover:bg-brand-cyan/20"
                      >
                        <span>
                          <span className="font-medium text-brand-cyan">{a.code ?? a.audit_type.toUpperCase()}</span>
                          <span className="ml-2 text-xs text-leo-muted">{a.company?.name}</span>
                        </span>
                        <span className="text-xs text-brand-cyan">
                          {format(new Date(a.planned_date), "EEE dd/MM", { locale: it })}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Azioni correttive */}
            {(urgentActions?.length ?? 0) > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-leo-muted">Azioni correttive in scadenza</h3>
                <ul className="space-y-1.5">
                  {(urgentActions ?? []).map((a: any) => (
                    <li key={a.id}>
                      <Link
                        href={`/actions/${a.id}`}
                        className="flex items-center justify-between rounded-md bg-status-orange/10 px-3 py-2 text-sm hover:bg-status-orange/20"
                      >
                        <span className="truncate">
                          <span className="font-medium">{a.title}</span>
                          {a.responsible && (
                            <span className="ml-2 text-xs text-leo-muted">
                              {a.responsible.first_name} {a.responsible.last_name}
                            </span>
                          )}
                        </span>
                        <span className="text-xs text-status-orange shrink-0 ml-2">
                          {format(new Date(a.due_date), "dd/MM")}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {(urgentTasks?.length ?? 0) === 0 && (urgentNc?.length ?? 0) === 0 && (urgentAudits?.length ?? 0) === 0 && (urgentActions?.length ?? 0) === 0 && (
              <p className="flex items-center gap-2 text-sm text-status-green">
                <CheckCircle2 className="h-4 w-4" /> Nessuna azione urgente. Sistema in stato verde.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Blocchi operativi */}
        <Card className="leo-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <XCircle className="h-4 w-4 text-status-red" />
              Blocchi operativi
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(blockedWelders?.length ?? 0) > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-leo-muted">Saldatori — qualifica scaduta</h3>
                <ul className="space-y-1.5">
                  {(blockedWelders ?? []).map((q: any) => (
                    <li key={q.id} className="flex items-center justify-between rounded-md bg-status-red/10 px-3 py-2 text-sm">
                      <span>
                        <span className="font-medium text-status-red">
                          {q.person?.first_name} {q.person?.last_name}
                        </span>
                        <Badge variant="orange" className="ml-2">{q.welding_process?.code}</Badge>
                        <span className="ml-2 text-xs text-leo-muted font-mono">{q.certificate_code}</span>
                      </span>
                      <span className="text-xs text-status-red">scaduta {format(new Date(q.expiry_date), "dd/MM/yy")}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {wpsWithoutWpqr.length > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-leo-muted">WPS senza WPQR valida</h3>
                <ul className="space-y-1.5">
                  {wpsWithoutWpqr.map((w: any) => (
                    <li key={w.id} className="flex items-center justify-between rounded-md bg-status-orange/10 px-3 py-2 text-sm">
                      <span>
                        <span className="font-medium">{w.code} r{w.revision}</span>
                        <span className="ml-2 text-xs text-leo-muted">{w.company?.name}</span>
                      </span>
                      <Link href={`/welding/wpqr`} className="text-xs text-brand-cyan hover:underline">aggiungi WPQR →</Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {(blockedAssets?.length ?? 0) > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-leo-muted">Asset fuori servizio</h3>
                <ul className="space-y-1.5">
                  {(blockedAssets ?? []).map((a: any) => (
                    <li key={a.id} className="flex items-center justify-between rounded-md bg-leo-card/40 px-3 py-2 text-sm">
                      <span>
                        <span className="font-mono text-xs">{a.code}</span>
                        <Badge variant="outline" className="ml-2">{a.asset_type}</Badge>
                      </span>
                      <Link href={`/assets/${a.id}`} className="text-xs text-brand-cyan hover:underline">apri →</Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {(blockedMaterials?.length ?? 0) > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-leo-muted">Materiali bloccati/NC</h3>
                <ul className="space-y-1.5">
                  {(blockedMaterials ?? []).map((m: any) => (
                    <li key={m.id} className="flex items-center justify-between rounded-md bg-status-red/10 px-3 py-2 text-sm">
                      <span>
                        <span className="font-medium">{m.material_grade}</span>
                        {m.heat_number && <span className="ml-2 text-xs font-mono text-leo-muted">({m.heat_number})</span>}
                      </span>
                      <Badge variant="red">{m.status}</Badge>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {(blockedWelders?.length ?? 0) === 0 && wpsWithoutWpqr.length === 0 && (blockedAssets?.length ?? 0) === 0 && (blockedMaterials?.length ?? 0) === 0 && (
              <p className="flex items-center gap-2 text-sm text-status-green">
                <CheckCircle2 className="h-4 w-4" /> Nessun blocco operativo attivo
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      {/* ====== Stato Norme ====== */}
      {(standardsStats?.length ?? 0) > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-leo-muted">
            Stato Norme — copertura requisiti per processi
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {standardsStats.map((s) => {
              const pct = s.requirements > 0 ? Math.round((s.covered / s.requirements) * 100) : 0;
              const tone = pct >= 80 ? "ok" : pct >= 50 ? "warning" : pct > 0 ? "danger" : "neutral";
              const t = TONE_CLASS[tone];
              return (
                <Link key={s.id} href={`/standards`} className="group block">
                  <Card className={cn("transition-all hover:scale-[1.02] hover:shadow-xl", t.card)}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-sm font-bold text-leo-text">{s.code}</div>
                          <div className="text-xs text-leo-muted">{s.version}</div>
                        </div>
                        <div className={cn("text-2xl font-bold", t.value)}>{pct}%</div>
                      </div>
                      <div className="mt-3">
                        <div className="h-2 overflow-hidden rounded-full bg-leo-card2">
                          <div
                            className={cn("h-full transition-all", pct >= 80 ? "bg-status-green" : pct >= 50 ? "bg-status-orange" : "bg-status-red")}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="mt-2 text-xs text-leo-muted">
                          {s.covered} di {s.requirements} requisiti coperti
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </>
  );
}
