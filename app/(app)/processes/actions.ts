"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/server";

const PROCESS_CATEGORIES = ["qualita", "sicurezza", "ambiente", "operativo", "saldatura", "direzione", "fornitori", "hr"] as const;

const processSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  category: z.enum(PROCESS_CATEGORIES),
  description: z.string().optional(),
});

export async function createProcessAction(formData: FormData) {
  const parsed = processSchema.parse(Object.fromEntries(formData));
  const supabase = await createServerClient();
  const { error } = await supabase.from("process").insert(parsed);
  if (error) return { error: error.message };
  revalidatePath("/processes");
  return { ok: true };
}

const procReqSchema = z.object({
  process_id: z.string().uuid(),
  requirement_id: z.string().uuid(),
  applicability: z.enum(["applicabile", "non_applicabile", "parziale"]).default("applicabile"),
  notes: z.string().optional(),
});

export async function linkProcessRequirementAction(formData: FormData) {
  const parsed = procReqSchema.parse(Object.fromEntries(formData));
  const supabase = await createServerClient();
  const { error } = await supabase.from("process_requirement").insert(parsed);
  if (error) return { error: error.message };
  revalidatePath(`/processes/${parsed.process_id}`);
  return { ok: true };
}

export async function unlinkProcessRequirementAction(id: string, processId: string) {
  const supabase = await createServerClient();
  const { error } = await supabase.from("process_requirement").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/processes/${processId}`);
  return { ok: true };
}
