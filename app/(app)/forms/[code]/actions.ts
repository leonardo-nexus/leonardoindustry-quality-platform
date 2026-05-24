"use server";
import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";

interface Payload {
  templateId: string;
  title?: string;
  notes?: string;
  values: Record<string, any>;
}

async function createSubmission({ templateId, title, notes, values }: Payload, status: "bozza" | "compilato") {
  const session = await requireSession();
  if (!session.person) return { error: "Profilo persona mancante. Contatta admin." };

  const supabase = await createServerClient();
  const insertPayload = {
    template_id: templateId,
    company_id: session.person.company_id,
    submitted_by: session.person.id,
    title: title || null,
    notes: notes || null,
    values,
    status: "bozza" as const,
  };

  // Inserisci prima in bozza, poi aggiorna a "compilato" per triggerare le automazioni
  const { data: created, error: insErr } = await supabase
    .from("form_submission")
    .insert(insertPayload)
    .select("id")
    .single();
  if (insErr) return { error: insErr.message };

  if (status === "compilato") {
    const { error: updErr } = await supabase
      .from("form_submission")
      .update({ status: "compilato" })
      .eq("id", created.id);
    if (updErr) return { error: updErr.message };
  }

  revalidatePath("/forms");
  revalidatePath("/forms/submissions");
  return { submissionId: created.id, ok: true };
}

export async function submitFormAction(p: Payload) { return createSubmission(p, "compilato"); }
export async function saveDraftAction(p: Payload) { return createSubmission(p, "bozza"); }
