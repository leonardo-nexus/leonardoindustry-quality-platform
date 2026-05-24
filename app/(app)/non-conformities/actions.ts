"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/server";

const ncSchema = z.object({
  company_id: z.string().uuid(),
  process_id: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
  requirement_id: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
  audit_id: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
  code: z.string().optional(),
  severity: z.enum(["minore","maggiore","critica"]).default("minore"),
  title: z.string().min(1),
  description: z.string().min(1),
  detected_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  responsible_id: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
});

export async function createNcAction(formData: FormData) {
  const parsed = ncSchema.parse(Object.fromEntries(formData));
  const supabase = await createServerClient();
  const { error } = await supabase.from("non_conformity").insert(parsed);
  if (error) return { error: error.message };
  revalidatePath("/non-conformities");
  redirect("/non-conformities");
}

export async function updateNcStatusAction(id: string, status: string) {
  const supabase = await createServerClient();
  const patch: Record<string, unknown> = { status };
  if (status === "chiusa") {
    patch.closed_at = new Date().toISOString();
  }
  const { error } = await supabase.from("non_conformity").update(patch).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/non-conformities/${id}`);
  return { ok: true };
}
