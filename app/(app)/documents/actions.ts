"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "crypto";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/server";

const DOC_TYPES = ["procedura","istruzione","modulo","registro","certificato","disegno","wps","wpqr","rapporto_controllo","dossier","documento_esterno"] as const;
const DOC_STATUS = ["bozza","in_revisione","attivo","sospeso","obsoleto","archiviato"] as const;

const documentSchema = z.object({
  code: z.string().min(1),
  title: z.string().min(1),
  type: z.enum(DOC_TYPES),
  status: z.enum(DOC_STATUS).default("bozza"),
  company_id: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
  process_id: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
  review_frequency_months: z.coerce.number().int().positive().optional().or(z.literal("").transform(() => undefined)),
  notes: z.string().optional(),
});

export async function createDocumentAction(formData: FormData) {
  const parsed = documentSchema.parse(Object.fromEntries(formData));
  const supabase = await createServerClient();
  const { error } = await supabase.from("document").insert(parsed);
  if (error) return { error: error.message };
  revalidatePath("/documents");
  redirect("/documents");
}

export async function updateDocumentStatusAction(id: string, status: typeof DOC_STATUS[number]) {
  const supabase = await createServerClient();
  const { error } = await supabase.from("document").update({ status }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/documents/${id}`);
  return { ok: true };
}

export async function uploadDocumentRevisionAction(formData: FormData) {
  const documentId = String(formData.get("document_id") ?? "");
  const revision = String(formData.get("revision") ?? "").trim();
  const issueDate = String(formData.get("issue_date") ?? "") || null;
  const nextReviewDate = String(formData.get("next_review_date") ?? "") || null;
  const file = formData.get("file") as File | null;
  const setCurrent = formData.get("is_current") === "true";

  if (!documentId || !revision) return { error: "Documento e revisione richiesti" };

  const supabase = await createServerClient();
  const { data: doc } = await supabase
    .from("document")
    .select("company_id")
    .eq("id", documentId)
    .maybeSingle();
  if (!doc) return { error: "Documento non trovato" };

  let fileId: string | null = null;
  if (file && file.size > 0) {
    const companyFolder = doc.company_id ?? "group";
    const fileExt = (file.name.split(".").pop() ?? "bin").toLowerCase();
    const storagePath = `${companyFolder}/${new Date().getFullYear()}/${documentId}/${randomUUID()}.${fileExt}`;
    const arrayBuf = await file.arrayBuffer();
    const { error: upErr } = await supabase.storage
      .from("documents")
      .upload(storagePath, arrayBuf, { contentType: file.type, upsert: false });
    if (upErr) return { error: `Upload: ${upErr.message}` };
    const { data: fa, error: faErr } = await supabase
      .from("file_attachment")
      .insert({
        company_id: doc.company_id,
        bucket: "documents",
        storage_path: storagePath,
        file_name: file.name,
        mime_type: file.type,
        size_bytes: file.size,
      })
      .select("id")
      .single();
    if (faErr) return { error: `File attachment: ${faErr.message}` };
    fileId = fa.id;
  }

  if (setCurrent) {
    await supabase
      .from("document_revision")
      .update({ is_current: false })
      .eq("document_id", documentId);
  }

  const { error } = await supabase.from("document_revision").insert({
    document_id: documentId,
    revision,
    issue_date: issueDate,
    next_review_date: nextReviewDate,
    file_id: fileId,
    is_current: setCurrent,
  });
  if (error) return { error: error.message };
  revalidatePath(`/documents/${documentId}`);
  return { ok: true };
}

export async function getRevisionSignedUrlAction(fileId: string) {
  const supabase = await createServerClient();
  const { data: fa } = await supabase
    .from("file_attachment")
    .select("bucket, storage_path")
    .eq("id", fileId)
    .maybeSingle();
  if (!fa) return { error: "File non trovato" };
  const { data, error } = await supabase.storage
    .from(fa.bucket)
    .createSignedUrl(fa.storage_path, 60 * 5);
  if (error) return { error: error.message };
  return { url: data.signedUrl };
}
