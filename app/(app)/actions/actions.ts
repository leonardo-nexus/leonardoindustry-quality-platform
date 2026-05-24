"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/server";

const actionSchema = z.object({
  company_id: z.string().uuid(),
  non_conformity_id: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
  source_type: z.enum(["non_conformita","audit","incidente","rischio","miglioramento","reclamo_cliente","altro"]).default("non_conformita"),
  title: z.string().min(1),
  root_cause: z.string().optional(),
  action_plan: z.string().min(1),
  responsible_id: z.string().uuid(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function createCorrectiveActionAction(formData: FormData) {
  const parsed = actionSchema.parse(Object.fromEntries(formData));
  const supabase = await createServerClient();
  const { error } = await supabase.from("corrective_action").insert(parsed);
  if (error) return { error: error.message };
  if (parsed.non_conformity_id) {
    await supabase
      .from("non_conformity")
      .update({ status: "azione_definita" })
      .eq("id", parsed.non_conformity_id);
    revalidatePath(`/non-conformities/${parsed.non_conformity_id}`);
  }
  revalidatePath("/actions");
  return { ok: true };
}

const verifySchema = z.object({
  effectiveness_check: z.string().min(1),
  effectiveness_verified_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  effectiveness_verified_by: z.string().uuid(),
  status: z.enum(["efficace","non_efficace"]),
});

export async function verifyActionAction(id: string, formData: FormData) {
  const parsed = verifySchema.parse(Object.fromEntries(formData));
  const supabase = await createServerClient();
  const { data: act, error } = await supabase
    .from("corrective_action")
    .update({ ...parsed, completed_at: new Date().toISOString().slice(0, 10) })
    .eq("id", id)
    .select("non_conformity_id")
    .single();
  if (error) return { error: error.message };
  if (parsed.status === "efficace" && act.non_conformity_id) {
    await supabase
      .from("non_conformity")
      .update({ status: "in_verifica" })
      .eq("id", act.non_conformity_id);
  }
  revalidatePath(`/actions/${id}`);
  if (act.non_conformity_id) revalidatePath(`/non-conformities/${act.non_conformity_id}`);
  return { ok: true };
}
