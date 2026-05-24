import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { ScanLine } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createServerClient, createServiceRoleClient } from "@/lib/supabase/server";
import { OcrReviewForm } from "./review-form";

export default async function OcrDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerClient();
  const { data: ocr } = await supabase
    .from("ocr_extraction")
    .select("*, source_file:source_file_id(file_name, mime_type, storage_path, bucket), verifier:verified_by(first_name, last_name)")
    .eq("id", id)
    .maybeSingle();
  if (!ocr) notFound();

  let previewUrl: string | null = null;
  if (ocr.source_file?.storage_path && ocr.source_file?.bucket) {
    const admin = createServiceRoleClient();
    const { data } = await admin.storage.from(ocr.source_file.bucket).createSignedUrl(ocr.source_file.storage_path, 600);
    previewUrl = data?.signedUrl ?? null;
  }

  return (
    <>
      <PageHeader
        title={`OCR review · ${ocr.doc_type ?? "altro"}`}
        description={`${ocr.source_file?.file_name ?? "—"} · stato ${ocr.status}`}
        actions={<Button asChild variant="outline"><Link href="/ocr">← Coda OCR</Link></Button>}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Preview documento */}
        <Card className="leo-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><ScanLine className="h-4 w-4" /> Documento scansionato</CardTitle>
          </CardHeader>
          <CardContent>
            {previewUrl && (ocr.source_file?.mime_type ?? "").startsWith("image/") ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={previewUrl} alt="" className="mx-auto max-h-[500px] rounded border border-leo-border" />
            ) : previewUrl ? (
              <iframe src={previewUrl} className="w-full h-[500px] rounded border border-leo-border" />
            ) : (
              <p className="text-xs text-leo-muted">File non disponibile</p>
            )}
            <div className="mt-3 text-xs text-leo-muted">
              <Badge variant="outline" className="text-[10px] mr-2">{ocr.doc_type ?? "altro"}</Badge>
              Creato {format(new Date(ocr.created_at), "dd/MM/yyyy HH:mm")}
              {ocr.processed_at && ` · processato ${format(new Date(ocr.processed_at), "dd/MM HH:mm")}`}
              {ocr.verified_at && ` · verificato ${format(new Date(ocr.verified_at), "dd/MM HH:mm")}`}
              {(ocr as any).verifier && ` da ${(ocr as any).verifier.first_name} ${(ocr as any).verifier.last_name}`}
            </div>
          </CardContent>
        </Card>

        {/* Manual review form */}
        <Card className="leo-card">
          <CardHeader>
            <CardTitle className="text-base">Trascrizione + campi estratti</CardTitle>
          </CardHeader>
          <CardContent>
            <OcrReviewForm
              ocrId={id}
              initialRawText={ocr.raw_text ?? ""}
              initialFields={(ocr.extracted_fields as any) ?? {}}
              docType={ocr.doc_type}
              status={ocr.status}
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
