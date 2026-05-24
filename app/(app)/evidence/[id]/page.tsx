import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { MapPin, AlertTriangle, FileSignature, Camera } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createServerClient, createServiceRoleClient } from "@/lib/supabase/server";
import { ApproveReject } from "./approve-reject";

export default async function EvidenceDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerClient();
  const { data: ev } = await supabase
    .from("live_evidence")
    .select("*, file:file_id(file_name, mime_type, size_bytes, storage_path, bucket), uploader:uploaded_by(first_name, last_name)")
    .eq("id", id)
    .maybeSingle();
  if (!ev) notFound();

  // signed URL preview
  let previewUrl: string | null = null;
  if (ev.file?.storage_path && ev.file?.bucket) {
    const admin = createServiceRoleClient();
    const { data } = await admin.storage.from(ev.file.bucket).createSignedUrl(ev.file.storage_path, 600);
    previewUrl = data?.signedUrl ?? null;
  }

  // Firme correlate
  const adminPub = createServiceRoleClient();
  const { data: sigs } = await adminPub.from("applicative_signature")
    .select("id, action, source, signed_at, person:person_id(first_name, last_name)")
    .or(`entity_type.eq.live_evidence,entity_id.eq.${id}`)
    .order("signed_at", { ascending: false })
    .limit(10);

  return (
    <>
      <PageHeader
        title={`Evidenza ${ev.evidence_type}`}
        description={`${ev.file?.file_name ?? "—"} · ${(ev.uploader as any)?.first_name ?? ""} ${(ev.uploader as any)?.last_name ?? ""}`}
        actions={<Button asChild variant="outline"><Link href="/evidence">← Evidenze</Link></Button>}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          {/* Preview */}
          <Card className="leo-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Camera className="h-4 w-4" /> Anteprima</CardTitle>
            </CardHeader>
            <CardContent>
              {previewUrl && (ev.file?.mime_type ?? "").startsWith("image/") ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={previewUrl} alt={ev.file?.file_name ?? ""} className="mx-auto max-h-96 rounded-md border border-leo-border" />
              ) : previewUrl ? (
                <a href={previewUrl} target="_blank" className="text-brand-cyan underline" rel="noreferrer">Apri file ({ev.file?.mime_type})</a>
              ) : (
                <p className="text-xs text-leo-muted">File non disponibile</p>
              )}
            </CardContent>
          </Card>

          {/* Metadata */}
          <Card className="leo-card">
            <CardHeader>
              <CardTitle className="text-base">Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-xs">
              <Row label="Tipo" value={ev.evidence_type} />
              <Row label="Source" value={<Badge variant="outline">{ev.source}</Badge>} />
              <Row label="Captured" value={format(new Date(ev.captured_at), "dd/MM/yyyy HH:mm")} />
              <Row label="Uploaded" value={format(new Date(ev.uploaded_at), "dd/MM/yyyy HH:mm")} />
              <Row label="Verifica" value={<Badge variant={ev.verification_status === "verificata" ? "green" : ev.verification_status === "sospetta" ? "red" : "yellow"}>{ev.verification_status}</Badge>} />
              <Row label="SHA256" value={<code className="text-[10px]">{ev.file_sha256?.slice(0, 24)}…</code>} />
              <Row label="Dispositivo" value={<code className="text-[10px]">{ev.device_info?.slice(0, 80) ?? "—"}</code>} />
              <Row label="Geo" value={ev.latitude && ev.longitude ? <a href={`https://www.google.com/maps?q=${ev.latitude},${ev.longitude}`} target="_blank" rel="noreferrer" className="text-brand-cyan underline"><MapPin className="inline h-3 w-3" /> {ev.latitude.toFixed(4)}, {ev.longitude.toFixed(4)}</a> : "—"} />
              <Row label="Checklist" value={ev.checklist_id ? <Link href={`/quality-sentinel/checklists/${ev.checklist_id}`} className="text-brand-cyan underline">apri →</Link> : "—"} />
              <Row label="Notes" value={ev.notes ?? "—"} />
              {ev.suspicion_flags && (
                <div className="mt-2 rounded-md border border-status-red/30 bg-status-red/5 p-2">
                  <p className="text-xs font-semibold text-status-red"><AlertTriangle className="inline h-3 w-3 mr-1" /> Flags sospetti</p>
                  <pre className="text-[10px] mt-1 overflow-x-auto">{JSON.stringify(ev.suspicion_flags, null, 2)}</pre>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {/* Approva/Respingi */}
          {ev.verification_status === "in_verifica" && (
            <Card className="leo-card">
              <CardHeader><CardTitle className="text-base">Verifica</CardTitle></CardHeader>
              <CardContent>
                <ApproveReject evidenceId={id} />
              </CardContent>
            </Card>
          )}

          {/* Firme correlate */}
          <Card className="leo-card">
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><FileSignature className="h-4 w-4" /> Firme applicative ({sigs?.length ?? 0})</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-xs">
              {(sigs?.length ?? 0) === 0 && <p className="text-leo-muted">Nessuna firma collegata</p>}
              {(sigs ?? []).map((s: any) => (
                <div key={s.id} className="rounded-md border border-leo-border bg-leo-card/40 px-2 py-1.5">
                  <Badge variant="outline" className="text-[10px] mr-1">{s.action}</Badge>
                  <Badge variant="outline" className="text-[10px] mr-1">{s.source}</Badge>
                  {s.person?.first_name} {s.person?.last_name} · {format(new Date(s.signed_at), "dd/MM HH:mm")}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-leo-muted">{label}</span>
      <span>{value}</span>
    </div>
  );
}
