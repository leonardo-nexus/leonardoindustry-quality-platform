import Link from "next/link";
import { format } from "date-fns";
import { Camera, MapPin, AlertOctagon, Filter, ScanLine } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createServerClient } from "@/lib/supabase/server";

const TYPE_LABEL: Record<string, string> = {
  foto_materiale: "Foto materiale",
  foto_etichetta: "Foto etichetta",
  foto_seriale: "Foto seriale",
  foto_saldatura: "Foto saldatura",
  foto_controllo: "Foto controllo",
  documento_scansionato: "Doc scansionato",
  verbale_firmato: "Verbale firmato",
  video_breve: "Video",
  firma_operatore: "Firma operatore",
  firma_responsabile: "Firma responsabile",
};

export default async function EvidenceIndex({ searchParams }: { searchParams: Promise<{ entity?: string; status?: string; sus?: string; nogeo?: string }> }) {
  const sp = await searchParams;
  const supabase = await createServerClient();

  let q: any = supabase
    .from("live_evidence")
    .select("id, evidence_type, source, captured_at, latitude, longitude, verification_status, suspicion_flags, uploaded_by, file_sha256, notes, checklist_id, file:file_id(file_name, mime_type, size_bytes), uploader:uploaded_by(first_name, last_name)")
    .order("captured_at", { ascending: false })
    .limit(100);
  if (sp.entity) q = q.eq("evidence_type", sp.entity);
  if (sp.status) q = q.eq("verification_status", sp.status);
  if (sp.sus === "1") q = q.not("suspicion_flags", "is", null);
  if (sp.nogeo === "1") q = q.is("latitude", null);

  const { data: evidences } = await q;

  return (
    <>
      <PageHeader
        title="Evidenze live"
        description={`${evidences?.length ?? 0} evidenze · foto + scansioni + firme da mobile/desktop`}
      />

      <Card className="leo-card mb-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4" /> Filtri
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-2 sm:grid-cols-5">
            <label className="text-xs">
              <span className="block text-leo-muted mb-1">Tipo</span>
              <select name="entity" defaultValue={sp.entity ?? ""} className="w-full rounded-md border border-leo-border bg-leo-card px-2 py-1.5 text-sm">
                <option value="">— tutti —</option>
                {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
            <label className="text-xs">
              <span className="block text-leo-muted mb-1">Stato verifica</span>
              <select name="status" defaultValue={sp.status ?? ""} className="w-full rounded-md border border-leo-border bg-leo-card px-2 py-1.5 text-sm">
                <option value="">— tutti —</option>
                <option value="in_verifica">In verifica</option>
                <option value="verificata">Verificata</option>
                <option value="sospetta">Sospetta</option>
                <option value="respinta">Respinta</option>
              </select>
            </label>
            <label className="text-xs flex items-end">
              <label className="flex items-center gap-1 text-sm">
                <input type="checkbox" name="sus" value="1" defaultChecked={sp.sus === "1"} />
                Solo sospette
              </label>
            </label>
            <label className="text-xs flex items-end">
              <label className="flex items-center gap-1 text-sm">
                <input type="checkbox" name="nogeo" value="1" defaultChecked={sp.nogeo === "1"} />
                Senza geo
              </label>
            </label>
            <div className="flex gap-2 items-end">
              <Button type="submit" size="sm">Filtra</Button>
              <Button asChild type="button" size="sm" variant="ghost"><Link href="/evidence">Reset</Link></Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="leo-card">
        <CardContent className="p-0">
          <div className="divide-y divide-leo-border max-h-[70vh] overflow-y-auto">
            {(evidences ?? []).map((e: any) => (
              <Link key={e.id} href={`/evidence/${e.id}`} className="block p-3 text-sm hover:bg-leo-card/40">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {(e.file?.mime_type ?? "").startsWith("image/") ? <Camera className="h-3 w-3 text-brand-cyan" /> : <ScanLine className="h-3 w-3 text-brand-cyan" />}
                      <Badge variant="outline" className="text-[10px]">{TYPE_LABEL[e.evidence_type] ?? e.evidence_type}</Badge>
                      <Badge variant={e.verification_status === "verificata" ? "green" : e.verification_status === "sospetta" ? "red" : "yellow"} className="text-[10px]">{e.verification_status}</Badge>
                      <span className="text-[10px] text-leo-muted uppercase">{e.source}</span>
                      {e.suspicion_flags && (Array.isArray(e.suspicion_flags) ? e.suspicion_flags.length > 0 : Object.keys(e.suspicion_flags).length > 0) && (
                        <Badge variant="red" className="text-[10px]"><AlertOctagon className="mr-1 h-3 w-3" /> sospetta</Badge>
                      )}
                      {e.latitude && e.longitude && <Badge variant="outline" className="text-[10px]"><MapPin className="mr-1 h-3 w-3" /> geo</Badge>}
                    </div>
                    <div className="mt-1 text-xs text-leo-muted">
                      {e.uploader?.first_name} {e.uploader?.last_name} · {format(new Date(e.captured_at), "dd/MM/yyyy HH:mm")} · {e.file?.file_name ?? "—"}
                      {e.notes && ` · ${e.notes.slice(0, 80)}`}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
            {(evidences?.length ?? 0) === 0 && (
              <div className="p-8 text-center text-sm text-leo-muted">
                <Camera className="mx-auto mb-2 h-6 w-6" /> Nessuna evidenza per questi filtri
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
