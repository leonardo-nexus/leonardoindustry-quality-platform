import Link from "next/link";
import { format } from "date-fns";
import { ScanLine, AlertOctagon, CheckCircle2, Clock } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createServerClient } from "@/lib/supabase/server";

const DOC_LABEL: Record<string, string> = {
  bolla_ddt: "Bolla / DDT",
  certificato_materiale: "Certificato materiale",
  scheda_tecnica: "Scheda tecnica",
  fattura: "Fattura",
  preventivo: "Preventivo",
  verbale: "Verbale",
  contratto: "Contratto",
  etichetta: "Etichetta",
  seriale: "Seriale",
  altro: "Altro",
};

const STATUS_VARIANT: Record<string, "yellow" | "blue" | "green" | "red" | "outline"> = {
  da_processare: "yellow",
  processato: "blue",
  errore: "red",
  verificato_manualmente: "green",
};

export default async function OcrIndex({ searchParams }: { searchParams: Promise<{ status?: string; type?: string }> }) {
  const sp = await searchParams;
  const supabase = await createServerClient();

  let q: any = supabase
    .from("ocr_extraction")
    .select("id, doc_type, status, confidence_score, source_entity_type, source_entity_id, created_at, processed_at, source_file:source_file_id(file_name, mime_type)")
    .order("created_at", { ascending: false })
    .limit(100);
  if (sp.status) q = q.eq("status", sp.status);
  if (sp.type) q = q.eq("doc_type", sp.type);
  const { data: items } = await q;

  const pending = (items ?? []).filter((i: any) => i.status === "da_processare").length;
  const processed = (items ?? []).filter((i: any) => i.status === "processato").length;
  const verified = (items ?? []).filter((i: any) => i.status === "verificato_manualmente").length;
  const errors = (items ?? []).filter((i: any) => i.status === "errore").length;

  return (
    <>
      <PageHeader
        title="OCR queue"
        description="Estrazione/trascrizione documenti scansionati: bolle, certificati, schede tecniche, fatture"
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Da processare" value={pending} icon={Clock} color="text-status-yellow" />
        <Kpi label="Processati" value={processed} icon={ScanLine} color="text-brand-cyan" />
        <Kpi label="Verificati" value={verified} icon={CheckCircle2} color="text-status-green" />
        <Kpi label="Errori" value={errors} icon={AlertOctagon} color="text-status-red" />
      </div>

      <div className="mb-3 flex flex-wrap gap-2 text-xs">
        <Link href="/ocr" className={`rounded-md border px-3 py-1 ${!sp.status ? "bg-leo-card border-brand-cyan" : "border-leo-border"}`}>Tutti</Link>
        <Link href="/ocr?status=da_processare" className={`rounded-md border px-3 py-1 ${sp.status === "da_processare" ? "bg-leo-card border-brand-cyan" : "border-leo-border"}`}>Da processare</Link>
        <Link href="/ocr?status=processato" className={`rounded-md border px-3 py-1 ${sp.status === "processato" ? "bg-leo-card border-brand-cyan" : "border-leo-border"}`}>Processati</Link>
        <Link href="/ocr?status=verificato_manualmente" className={`rounded-md border px-3 py-1 ${sp.status === "verificato_manualmente" ? "bg-leo-card border-brand-cyan" : "border-leo-border"}`}>Verificati</Link>
      </div>

      <Card className="leo-card">
        <CardHeader>
          <CardTitle className="text-base">Coda OCR ({items?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {(items ?? []).map((i: any) => (
            <Link key={i.id} href={`/ocr/${i.id}`} className="flex items-center justify-between rounded-md border border-leo-border bg-leo-card/40 px-3 py-2 text-sm hover:bg-leo-card">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <ScanLine className="h-4 w-4 shrink-0 text-brand-cyan" />
                <Badge variant="outline" className="text-[10px]">{DOC_LABEL[i.doc_type ?? "altro"]}</Badge>
                <span className="truncate">{i.source_file?.file_name ?? "—"}</span>
                {i.source_entity_type && <Badge variant="outline" className="text-[10px]">{i.source_entity_type}</Badge>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] text-leo-muted">{format(new Date(i.created_at), "dd/MM HH:mm")}</span>
                <Badge variant={STATUS_VARIANT[i.status]} className="text-[10px]">{i.status.replace(/_/g, " ")}</Badge>
              </div>
            </Link>
          ))}
          {(items?.length ?? 0) === 0 && (
            <p className="text-center py-8 text-sm text-leo-muted">Nessun documento OCR in coda. Le scansioni da Mobile Evidence Layer compaiono qui.</p>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function Kpi({ label, value, icon: Icon, color }: { label: string; value: number; icon: any; color: string }) {
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
