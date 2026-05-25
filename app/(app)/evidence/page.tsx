import Link from "next/link";
import { format, subMinutes, startOfDay } from "date-fns";
import {
  AlertOctagon,
  Barcode,
  Camera,
  CheckSquare,
  FileUp,
  Link2,
  Lock,
  MapPin,
  Mic,
  PackageCheck,
  Radio,
  ScanLine,
  ShieldAlert,
  Timer,
  type LucideIcon,
  UploadCloud,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createServerClient, createServiceRoleClient } from "@/lib/supabase/server";
import {
  EvidenceQuickWizard,
  type EvidenceMode,
  type EvidenceProject,
} from "@/components/evidence/evidence-quick-wizard";

type BadgeTone = "green" | "yellow" | "red" | "gray" | "outline";

type EvidenceRow = {
  id: string;
  evidence_type: string | null;
  source: string | null;
  captured_at: string;
  uploaded_at: string | null;
  latitude: number | null;
  longitude: number | null;
  verification_status: string | null;
  suspicion_flags: unknown;
  uploaded_by: string | null;
  file_sha256: string | null;
  notes: string | null;
  checklist_id: string | null;
  project_id: string | null;
  file: {
    file_name: string | null;
    mime_type: string | null;
    size_bytes: number | null;
    storage_path: string | null;
    bucket: string | null;
  } | null;
  uploader: { first_name: string | null; last_name: string | null } | null;
  project: { code: string | null; name: string | null } | null;
};

type QualityEventRow = {
  event_type: string | null;
  message: string | null;
  severity: string | null;
  created_at: string;
};

const TYPE_LABEL: Record<string, string> = {
  foto_materiale: "Foto materiale",
  foto_etichetta: "Foto etichetta",
  foto_seriale: "Foto seriale",
  foto_saldatura: "Foto saldatura",
  foto_controllo: "Foto controllo",
  documento_scansionato: "Documento scansionato",
  verbale_firmato: "Verbale firmato",
  video_breve: "Video",
  firma_operatore: "Firma operatore",
  firma_responsabile: "Firma responsabile",
};

const VERIFICATION_TONE: Record<string, BadgeTone> = {
  verificata: "green",
  in_verifica: "yellow",
  sospetta: "red",
  respinta: "red",
};

export default async function EvidenceIndex() {
  const supabase = await createServerClient();
  const admin = createServiceRoleClient();
  const now = new Date();
  const todayIso = startOfDay(now).toISOString();
  const recentIso = subMinutes(now, 30).toISOString();

  const [
    { data: evidences },
    { count: todayCount },
    { count: recentCount },
    { count: suspiciousCount },
    { count: unverifiedCount },
    { count: unroutedCount },
    { count: ocrPendingCount },
    { count: mobileNcCount },
    { count: missingChecklistEvidence },
    { count: liveBlocksCount },
    { data: recentEvents },
  ] = await Promise.all([
    supabase
      .from("live_evidence")
      .select("id, evidence_type, source, captured_at, uploaded_at, latitude, longitude, verification_status, suspicion_flags, uploaded_by, file_sha256, notes, checklist_id, project_id, file:file_id(file_name, mime_type, size_bytes, storage_path, bucket), uploader:uploaded_by(first_name, last_name), project:project_id(code,name)")
      .order("captured_at", { ascending: false })
      .limit(60),
    supabase.from("live_evidence").select("id", { count: "exact", head: true }).gte("captured_at", todayIso),
    supabase.from("live_evidence").select("id", { count: "exact", head: true }).gte("uploaded_at", recentIso),
    supabase.from("live_evidence").select("id", { count: "exact", head: true }).eq("verification_status", "sospetta"),
    supabase.from("live_evidence").select("id", { count: "exact", head: true }).in("verification_status", ["in_verifica", "sospetta"]),
    supabase.from("live_evidence").select("id", { count: "exact", head: true }).is("checklist_id", null),
    supabase.from("ocr_extraction").select("id", { count: "exact", head: true }).in("status", ["da_processare", "errore"]),
    supabase.from("non_conformity").select("id", { count: "exact", head: true }).neq("status", "chiusa").gte("created_at", todayIso),
    supabase.from("quality_checklist_item").select("id", { count: "exact", head: true }).eq("attachment_required", true).is("attachment_file_id", null),
    supabase.from("quality_block").select("id", { count: "exact", head: true }).eq("status", "aperto").eq("active", true),
    supabase
      .from("quality_event_log")
      .select("event_type, message, severity, created_at")
      .order("created_at", { ascending: false })
      .limit(12),
  ]);

  const { data: activeProjects } = await supabase
    .from("project")
    .select("id, code, name, company_id")
    .eq("active", true)
    .order("code")
    .limit(200);
  const projects = (activeProjects ?? []) as EvidenceProject[];
  const evidenceRows = (evidences ?? []) as unknown as EvidenceRow[];
  const eventRows = (recentEvents ?? []) as QualityEventRow[];

  const previewUrls = new Map<string, string>();
  for (const ev of evidenceRows.slice(0, 16)) {
    if (ev.file?.storage_path && ev.file?.bucket && (ev.file.mime_type ?? "").startsWith("image/")) {
      const { data } = await admin.storage.from(ev.file.bucket).createSignedUrl(ev.file.storage_path, 600);
      if (data?.signedUrl) previewUrls.set(ev.id, data.signedUrl);
    }
  }

  return (
    <>
      <PageHeader
        title="Live Evidence Operational Center"
        description="Evidenze dal campo, OCR, blocchi, NC e routing operativo in tempo reale."
      />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5 xl:grid-cols-9">
        <LiveKpi label="Evidenze oggi" value={todayCount ?? 0} tone="ok" icon={Camera} />
        <LiveKpi label="Ultimi 30 min" value={recentCount ?? 0} tone="info" icon={Timer} />
        <LiveKpi label="Sospette" value={suspiciousCount ?? 0} tone="suspect" icon={ShieldAlert} />
        <LiveKpi label="Non verificate" value={unverifiedCount ?? 0} tone="warn" icon={AlertOctagon} />
        <LiveKpi label="Senza destinazione" value={unroutedCount ?? 0} tone="warn" icon={Link2} />
        <LiveKpi label="OCR pending" value={ocrPendingCount ?? 0} tone="info" icon={ScanLine} />
        <LiveKpi label="NC mobile" value={mobileNcCount ?? 0} tone="danger" icon={AlertOctagon} />
        <LiveKpi label="Checklist scoperte" value={missingChecklistEvidence ?? 0} tone="warn" icon={CheckSquare} />
        <LiveKpi label="Blocchi live" value={liveBlocksCount ?? 0} tone="danger" icon={Lock} />
      </div>

      <Card className="leo-card sticky top-0 z-20 mb-6 border-brand-cyan/40 bg-leo-sidebar/95">
        <CardContent className="grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-5">
          <WizardAction mode="photo" projects={projects} icon={Camera} label="Nuova foto" />
          <WizardAction mode="scan" projects={projects} icon={ScanLine} label="Scannerizza documento" />
          <Action href="/materials/receptions" icon={PackageCheck} label="Ricezione materiale" />
          <Action href="/non-conformities/new" icon={AlertOctagon} label="Apri NC rapida" danger />
          <Action href="/quality-sentinel/checklists" icon={CheckSquare} label="Compila checklist" />
          <Action href="/materials" icon={Barcode} label="QR / barcode" />
          <WizardAction mode="audio" projects={projects} icon={Mic} label="Nota vocale" />
          <WizardAction mode="file" projects={projects} icon={FileUp} label="Carica documento" />
          <WizardAction mode="scan" projects={projects} icon={UploadCloud} label="Invia OCR" />
          <Action href="/evidence?status=in_verifica" icon={Link2} label="Collega evidenza" />
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-leo-muted">
            <Radio className="h-4 w-4 text-status-green" />
            Feed evidenze operative
          </div>
          {evidenceRows.map((ev) => (
            <EvidenceCard key={ev.id} evidence={ev} previewUrl={previewUrls.get(ev.id) ?? null} />
          ))}
          {(evidences?.length ?? 0) === 0 && (
            <Card className="leo-card border-brand-cyan/30">
              <CardContent className="p-8 text-center text-sm text-leo-muted">
                <Camera className="mx-auto mb-2 h-7 w-7 text-brand-cyan" />
                Nessuna evidenza operativa presente.
              </CardContent>
            </Card>
          )}
        </section>

        <aside className="space-y-4">
          <Card className="leo-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Radio className="h-4 w-4 text-brand-cyan" />
                Eventi qualità live
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {eventRows.map((event, index) => (
                <div key={`${event.created_at}-${index}`} className="border-l-2 border-brand-cyan/50 pl-3 text-xs">
                  <div className="text-leo-muted">{format(new Date(event.created_at), "HH:mm")}</div>
                  <div className="font-medium">{event.message}</div>
                  <Badge variant={event.severity === "critical" || event.severity === "block" ? "red" : "outline"} className="mt-1 text-[10px]">
                    {event.event_type?.replace(/_/g, " ") ?? "evento"}
                  </Badge>
                </div>
              ))}
              {(recentEvents?.length ?? 0) === 0 && <p className="text-sm text-leo-muted">Nessun evento live registrato.</p>}
            </CardContent>
          </Card>

          <Card className="leo-card border-status-red/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Lock className="h-4 w-4 text-status-red" />
                Regole operative attive
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-leo-muted">
              <Rule text="Checklist non chiudibile con evidenze obbligatorie mancanti." />
              <Rule text="Documento senza destinazione resta in quarantena operativa." />
              <Rule text="OCR basso o incongruente richiede verifica manuale." />
              <Rule text="Evidenza sospetta genera alert e può aprire blocco qualità." />
            </CardContent>
          </Card>
        </aside>
      </div>
    </>
  );
}

function LiveKpi({ label, value, icon: Icon, tone }: { label: string; value: number; icon: LucideIcon; tone: "ok" | "info" | "warn" | "danger" | "suspect" }) {
  const toneClass = {
    ok: "border-status-green/40 bg-status-green/10 text-status-green",
    info: "border-brand-cyan/40 bg-brand-cyan/10 text-brand-cyan",
    warn: "border-status-yellow/40 bg-status-yellow/10 text-status-yellow",
    danger: "border-status-red/40 bg-status-red/10 text-status-red",
    suspect: "border-fuchsia-400/40 bg-fuchsia-500/10 text-fuchsia-300",
  }[tone];

  return (
    <Card className={`leo-card ${toneClass}`}>
      <CardContent className="p-3">
        <Icon className="mb-2 h-4 w-4" />
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-[10px] uppercase tracking-wide opacity-80">{label}</div>
      </CardContent>
    </Card>
  );
}

function Action({ href, icon: Icon, label, danger = false }: { href: string; icon: LucideIcon; label: string; danger?: boolean }) {
  return (
    <Button asChild variant="outline" className={danger ? "min-h-[44px] border-status-red/40 text-status-red hover:bg-status-red/10" : "min-h-[44px] border-brand-cyan/30 text-brand-cyan hover:bg-brand-cyan/10"}>
      <Link href={href}>
        <Icon className="h-4 w-4" />
        <span className="truncate">{label}</span>
      </Link>
    </Button>
  );
}

function WizardAction({
  mode,
  projects,
  icon: Icon,
  label,
}: {
  mode: EvidenceMode;
  projects: EvidenceProject[];
  icon: LucideIcon;
  label: string;
}) {
  return (
    <EvidenceQuickWizard
      mode={mode}
      projects={projects}
      trigger={
        <Button
          type="button"
          variant="outline"
          className="min-h-[44px] w-full border-brand-cyan/30 text-brand-cyan hover:bg-brand-cyan/10"
        >
          <Icon className="h-4 w-4" />
          <span className="truncate">{label}</span>
        </Button>
      }
    />
  );
}

function EvidenceCard({ evidence, previewUrl }: { evidence: EvidenceRow; previewUrl: string | null }) {
  const suspicionActive = Boolean(
    evidence.suspicion_flags &&
    (Array.isArray(evidence.suspicion_flags)
      ? evidence.suspicion_flags.length > 0
      : typeof evidence.suspicion_flags === "object" && Object.keys(evidence.suspicion_flags).length > 0),
  );
  const verificationTone = evidence.verification_status ? (VERIFICATION_TONE[evidence.verification_status] ?? "outline") : "outline";
  const routed = !!evidence.checklist_id || !!evidence.project_id;
  const confidence = evidence.verification_status === "verificata" ? 96 : suspicionActive ? 42 : routed ? 76 : 58;
  const congruence = suspicionActive ? "sospetta" : routed ? "coerente" : "quarantena";

  return (
    <Card className={`leo-card overflow-hidden ${suspicionActive ? "border-fuchsia-400/50" : evidence.verification_status === "respinta" ? "border-status-red/40" : ""}`}>
      <CardContent className="grid gap-4 p-4 md:grid-cols-[160px_1fr]">
        <Link href={`/evidence/${evidence.id}`} className="flex h-32 items-center justify-center overflow-hidden rounded-md border border-leo-border bg-leo-sidebar">
          {previewUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={previewUrl} alt={evidence.file?.file_name ?? "evidenza"} className="h-full w-full object-cover" />
          ) : (
            <ScanLine className="h-8 w-8 text-brand-cyan" />
          )}
        </Link>

        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="border-brand-cyan/30 text-brand-cyan">{TYPE_LABEL[evidence.evidence_type ?? ""] ?? evidence.evidence_type ?? "evidenza"}</Badge>
                <Badge variant={verificationTone}>{evidence.verification_status?.replace(/_/g, " ") ?? "in verifica"}</Badge>
                <Badge variant={routed ? "green" : "yellow"}>{routed ? "instradata" : "senza destinazione"}</Badge>
                <span className="rounded-md border border-leo-border px-2 py-0.5 text-xs text-leo-muted">{evidence.source}</span>
                {suspicionActive && <span className="rounded-md border border-fuchsia-400/40 bg-fuchsia-500/10 px-2 py-0.5 text-xs font-medium text-fuchsia-300">sospetta</span>}
              </div>
              <div className="mt-2 truncate text-sm font-semibold">{evidence.file?.file_name ?? evidence.notes ?? "Evidenza live"}</div>
              <div className="mt-1 text-xs text-leo-muted">
                {(evidence.uploader?.first_name ?? "Operatore")} {evidence.uploader?.last_name ?? ""} · {format(new Date(evidence.captured_at), "dd/MM/yyyy HH:mm")}
              </div>
            </div>
            <Button asChild size="sm" variant="outline" className="border-brand-cyan/30 text-brand-cyan">
              <Link href={`/evidence/${evidence.id}`}>Apri</Link>
            </Button>
          </div>

          <div className="grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-4">
            <Meta label="Commessa" value={evidence.project?.code ?? (evidence.project_id ? "collegata" : "quarantena")} tone={evidence.project_id ? "ok" : "warn"} />
            <Meta label="Checklist" value={evidence.checklist_id ? "collegata" : "mancante"} tone={evidence.checklist_id ? "ok" : "warn"} />
            <Meta label="OCR" value={evidence.evidence_type === "documento_scansionato" ? "da processare" : "non richiesto"} tone={evidence.evidence_type === "documento_scansionato" ? "info" : "muted"} />
            <Meta label="Congruenza" value={congruence} tone={congruence === "coerente" ? "ok" : congruence === "sospetta" ? "danger" : "warn"} />
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-leo-muted">
            {evidence.latitude && evidence.longitude && (
              <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3 text-status-green" /> geo presente</span>
            )}
            <span>Confidenza operativa {confidence}/100</span>
            {evidence.file_sha256 && <code className="text-[10px]">hash {String(evidence.file_sha256).slice(0, 12)}</code>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Meta({ label, value, tone }: { label: string; value: string; tone: "ok" | "warn" | "danger" | "info" | "muted" }) {
  const toneClass = {
    ok: "border-status-green/30 bg-status-green/10 text-status-green",
    warn: "border-status-yellow/30 bg-status-yellow/10 text-status-yellow",
    danger: "border-status-red/30 bg-status-red/10 text-status-red",
    info: "border-brand-cyan/30 bg-brand-cyan/10 text-brand-cyan",
    muted: "border-leo-border bg-leo-sidebar text-leo-muted",
  }[tone];
  return (
    <div className={`rounded-md border px-2 py-1.5 ${toneClass}`}>
      <div className="text-[10px] uppercase opacity-70">{label}</div>
      <div className="truncate font-semibold">{value}</div>
    </div>
  );
}

function Rule({ text }: { text: string }) {
  return (
    <div className="rounded-md border border-leo-border bg-leo-sidebar/60 px-3 py-2">
      {text}
    </div>
  );
}
