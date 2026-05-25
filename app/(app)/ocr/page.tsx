import Link from "next/link";
import { format } from "date-fns";
import {
  AlertOctagon,
  Archive,
  CheckCircle2,
  Clock,
  FileCheck2,
  FileQuestion,
  GitBranch,
  Layers3,
  PackageSearch,
  ScanLine,
  ShieldAlert,
  TimerReset,
  type LucideIcon,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createServerClient } from "@/lib/supabase/server";

type OcrStatusVariant = "yellow" | "blue" | "green" | "red" | "orange" | "gray" | "outline";

type OcrRow = {
  id: string;
  doc_type: string | null;
  status: string | null;
  confidence_score: number | null;
  source_entity_type: string | null;
  source_entity_id: string | null;
  created_at: string;
  processed_at: string | null;
  extracted_fields: Record<string, unknown> | null;
  source_file: { file_name: string | null; mime_type: string | null } | null;
};

const DOC_LABEL: Record<string, string> = {
  bolla_ddt: "DDT / bolla",
  ddt: "DDT",
  bolla: "Bolla",
  fattura: "Fattura",
  certificato_materiale: "Certificato",
  scheda_tecnica: "Scheda tecnica",
  dichiarazione_ce: "Dichiarazione CE",
  wps: "WPS",
  wpqr: "WPQR",
  qualifica_saldatore: "Qualifica saldatore",
  rapporto_prova: "Rapporto prova",
  collaudo: "Collaudo",
  documento_sicurezza: "Documento sicurezza",
  preventivo: "Preventivo",
  verbale: "Verbale",
  contratto: "Contratto",
  etichetta: "Etichetta",
  seriale: "Seriale",
  altro: "Altro",
};

const STATUS_MODEL: Record<string, { label: string; semantic: string; variant: OcrStatusVariant }> = {
  acquisito: { label: "acquisito", semantic: "acquisito", variant: "blue" },
  da_processare: { label: "pending OCR", semantic: "pending_ocr", variant: "yellow" },
  pending_ocr: { label: "pending OCR", semantic: "pending_ocr", variant: "yellow" },
  processing: { label: "processing", semantic: "processing", variant: "blue" },
  processato: { label: "da verificare", semantic: "to_verify", variant: "orange" },
  ocr_completed: { label: "OCR completato", semantic: "ocr_completed", variant: "blue" },
  low_confidence: { label: "bassa confidenza", semantic: "low_confidence", variant: "orange" },
  to_verify: { label: "da verificare", semantic: "to_verify", variant: "orange" },
  verificato_manualmente: { label: "verificato", semantic: "verified", variant: "green" },
  verified: { label: "verificato", semantic: "verified", variant: "green" },
  routed: { label: "instradato", semantic: "routed", variant: "green" },
  archived: { label: "archiviato", semantic: "archived", variant: "gray" },
  rejected: { label: "respinto", semantic: "rejected", variant: "red" },
  requires_manual_review: { label: "review manuale", semantic: "requires_manual_review", variant: "orange" },
  errore: { label: "errore OCR", semantic: "ocr_error", variant: "red" },
  ocr_error: { label: "errore OCR", semantic: "ocr_error", variant: "red" },
};

export default async function OcrIndex({ searchParams }: { searchParams: Promise<{ status?: string; type?: string }> }) {
  const sp = await searchParams;
  const supabase = await createServerClient();

  let q = supabase
    .from("ocr_extraction")
    .select("id, doc_type, status, confidence_score, source_entity_type, source_entity_id, created_at, processed_at, extracted_fields, source_file:source_file_id(file_name, mime_type)")
    .order("created_at", { ascending: false })
    .limit(100);
  if (sp.status) q = q.eq("status", sp.status);
  if (sp.type) q = q.eq("doc_type", sp.type);
  const { data: items } = await q;

  const rows = (items ?? []) as unknown as OcrRow[];
  const pending = rows.filter((i) => ["da_processare", "pending_ocr", "acquisito"].includes(i.status ?? "")).length;
  const completed = rows.filter((i) => ["processato", "ocr_completed", "to_verify", "verificato_manualmente", "verified", "routed"].includes(i.status ?? "")).length;
  const verified = rows.filter((i) => ["verificato_manualmente", "verified", "routed", "archived"].includes(i.status ?? "")).length;
  const errors = rows.filter((i) => ["errore", "ocr_error", "rejected"].includes(i.status ?? "")).length;
  const lowConfidence = rows.filter((i) => Number(i.confidence_score ?? 100) < 70 || i.status === "low_confidence").length;
  const unrouted = rows.filter((i) => !i.source_entity_type || !i.source_entity_id).length;
  const incongruent = rows.filter((i) => {
    const fields = i.extracted_fields as Record<string, unknown> | null;
    return fields?.congruence_status === "incongruent" || fields?.congruence_status === "non_congruente";
  }).length;

  return (
    <>
      <PageHeader
        title="Document Intelligence Queue"
        description="OCR, classificazione, verifica congruenza e routing documentale operativo."
      />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
        <OcrKpi label="Da processare" value={pending} icon={Clock} tone="warn" />
        <OcrKpi label="OCR completati" value={completed} icon={ScanLine} tone="info" />
        <OcrKpi label="Verificati" value={verified} icon={CheckCircle2} tone="ok" />
        <OcrKpi label="Errori OCR" value={errors} icon={AlertOctagon} tone="danger" />
        <OcrKpi label="Bassa confidenza" value={lowConfidence} icon={ShieldAlert} tone="warn" />
        <OcrKpi label="Non assegnati" value={unrouted} icon={FileQuestion} tone="warn" />
        <OcrKpi label="Non congruenti" value={incongruent} icon={ShieldAlert} tone="danger" />
        <OcrKpi label="Backlog" value={rows.length} icon={TimerReset} tone="info" />
      </div>

      <Card className="leo-card sticky top-0 z-20 mb-6 border-brand-cyan/40 bg-leo-sidebar/95">
        <CardContent className="flex flex-wrap gap-2 p-3">
          <FilterLink href="/ocr" active={!sp.status}>Tutti</FilterLink>
          <FilterLink href="/ocr?status=da_processare" active={sp.status === "da_processare"}>Pending OCR</FilterLink>
          <FilterLink href="/ocr?status=processato" active={sp.status === "processato"}>Da verificare</FilterLink>
          <FilterLink href="/ocr?status=verificato_manualmente" active={sp.status === "verificato_manualmente"}>Verificati</FilterLink>
          <Button asChild size="sm" variant="outline" className="border-status-red/40 text-status-red">
            <Link href="/evidence">Evidenze senza destinazione</Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="border-brand-cyan/40 text-brand-cyan">
            <Link href="/materials/receptions">Ricezione camion</Link>
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <section className="space-y-3">
          {rows.map((item) => (
            <OcrCard key={item.id} item={item} />
          ))}
          {(items?.length ?? 0) === 0 && (
            <Card className="leo-card border-brand-cyan/30">
              <CardContent className="p-8 text-center text-sm text-leo-muted">
                <ScanLine className="mx-auto mb-2 h-7 w-7 text-brand-cyan" />
                Nessun documento in coda intelligence.
              </CardContent>
            </Card>
          )}
        </section>

        <aside className="space-y-4">
          <Card className="leo-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Layers3 className="h-4 w-4 text-brand-cyan" />
                Stati OCR supportati
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {["acquisito", "pending_ocr", "processing", "ocr_completed", "low_confidence", "to_verify", "verified", "routed", "archived", "rejected", "requires_manual_review", "ocr_error"].map((status) => (
                <Badge key={status} variant={STATUS_MODEL[status]?.variant ?? "outline"} className="text-[10px]">
                  {status.replace(/_/g, " ")}
                </Badge>
              ))}
            </CardContent>
          </Card>

          <Card className="leo-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <PackageSearch className="h-4 w-4 text-status-green" />
                Tipi documento
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2 text-xs">
              {["DDT", "bolla", "fattura", "certificato", "scheda tecnica", "dichiarazione CE", "WPS", "WPQR", "qualifica saldatore", "rapporto prova", "collaudo", "sicurezza"].map((label) => (
                <div key={label} className="rounded-md border border-leo-border bg-leo-sidebar/60 px-2 py-1.5">{label}</div>
              ))}
            </CardContent>
          </Card>

          <Card className="leo-card border-status-red/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldAlert className="h-4 w-4 text-status-red" />
                Controlli congruenza
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-leo-muted">
              <Rule text="Documento corretto per fase, commessa e checklist." />
              <Rule text="Lotto, materiale e fornitore coerenti con atteso." />
              <Rule text="Duplicati e documenti scaduti bloccano il routing." />
              <Rule text="WPS/WPQR compatibili prima di chiusura fase." />
            </CardContent>
          </Card>
        </aside>
      </div>
    </>
  );
}

function OcrKpi({ label, value, icon: Icon, tone }: { label: string; value: number; icon: LucideIcon; tone: "ok" | "info" | "warn" | "danger" }) {
  const toneClass = {
    ok: "border-status-green/40 bg-status-green/10 text-status-green",
    info: "border-brand-cyan/40 bg-brand-cyan/10 text-brand-cyan",
    warn: "border-status-yellow/40 bg-status-yellow/10 text-status-yellow",
    danger: "border-status-red/40 bg-status-red/10 text-status-red",
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

function FilterLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Button asChild size="sm" variant="outline" className={active ? "border-brand-cyan/50 bg-brand-cyan/10 text-brand-cyan" : "border-leo-border text-leo-muted"}>
      <Link href={href}>{children}</Link>
    </Button>
  );
}

function OcrCard({ item }: { item: OcrRow }) {
  const status = STATUS_MODEL[item.status ?? ""] ?? { label: item.status ?? "sconosciuto", semantic: item.status ?? "unknown", variant: "outline" as const };
  const fields = (item.extracted_fields ?? {}) as Record<string, unknown>;
  const confidence = Math.round(Number(item.confidence_score ?? (item.status === "da_processare" ? 0 : 80)));
  const routed = !!item.source_entity_type && !!item.source_entity_id;
  const congruence = fields.congruence_status ? String(fields.congruence_status) : routed && confidence >= 70 ? "coerente" : "da verificare";

  return (
    <Card className={`leo-card ${status.variant === "red" ? "border-status-red/40" : confidence < 70 ? "border-status-orange/40" : ""}`}>
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="border-brand-cyan/30 text-brand-cyan">{DOC_LABEL[item.doc_type ?? "altro"] ?? item.doc_type}</Badge>
              <Badge variant={status.variant}>{status.label}</Badge>
              <Badge variant={routed ? "green" : "yellow"}>{routed ? "routing assegnato" : "non assegnato"}</Badge>
              <Badge variant={confidence >= 80 ? "green" : confidence >= 60 ? "orange" : "red"}>{confidence}% confidenza</Badge>
            </div>
            <div className="mt-2 truncate text-sm font-semibold">{item.source_file?.file_name ?? "Documento acquisito"}</div>
            <div className="mt-1 text-xs text-leo-muted">
              Creato {format(new Date(item.created_at), "dd/MM/yyyy HH:mm")}
              {item.processed_at && ` · OCR ${format(new Date(item.processed_at), "dd/MM HH:mm")}`}
            </div>
          </div>
          <Button asChild size="sm" variant="outline" className="border-brand-cyan/30 text-brand-cyan">
            <Link href={`/ocr/${item.id}`}>Apri review</Link>
          </Button>
        </div>

        <div className="grid gap-2 text-xs md:grid-cols-4">
          <Metric label="Stato engine" value={status.semantic.replace(/_/g, " ")} tone="info" />
          <Metric label="Routing" value={routed ? (item.source_entity_type ?? "assegnato") : "quarantena"} tone={routed ? "ok" : "warn"} />
          <Metric label="Congruenza" value={congruence} tone={String(congruence).includes("non") ? "danger" : congruence === "coerente" ? "ok" : "warn"} />
          <Metric label="Archivio" value={status.semantic === "routed" || status.semantic === "archived" ? "pronto" : "in lavorazione"} tone={status.semantic === "archived" ? "ok" : "info"} />
        </div>

        <div className="flex flex-wrap gap-2">
          <MiniAction icon={ScanLine} label="processOcrQueueItem" />
          <MiniAction icon={FileCheck2} label="verifyDocumentCongruence" />
          <MiniAction icon={GitBranch} label="routeEvidence" />
          <MiniAction icon={Archive} label="archiviazione automatica" />
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone: "ok" | "warn" | "danger" | "info" }) {
  const toneClass = {
    ok: "border-status-green/30 bg-status-green/10 text-status-green",
    warn: "border-status-yellow/30 bg-status-yellow/10 text-status-yellow",
    danger: "border-status-red/30 bg-status-red/10 text-status-red",
    info: "border-brand-cyan/30 bg-brand-cyan/10 text-brand-cyan",
  }[tone];
  return (
    <div className={`rounded-md border px-2 py-1.5 ${toneClass}`}>
      <div className="text-[10px] uppercase opacity-70">{label}</div>
      <div className="truncate font-semibold">{value}</div>
    </div>
  );
}

function MiniAction({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-leo-border bg-leo-sidebar/70 px-2 py-1 text-[10px] text-leo-muted">
      <Icon className="h-3 w-3 text-brand-cyan" />
      {label}
    </span>
  );
}

function Rule({ text }: { text: string }) {
  return <div className="rounded-md border border-leo-border bg-leo-sidebar/60 px-3 py-2">{text}</div>;
}
