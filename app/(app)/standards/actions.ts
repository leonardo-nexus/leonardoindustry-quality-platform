"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/server";

const standardSchema = z.object({
  code: z.string().min(1),
  version: z.string().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
});

export async function createStandardAction(formData: FormData) {
  const parsed = standardSchema.parse(Object.fromEntries(formData));
  const supabase = await createServerClient();
  const { error } = await supabase.from("standard").insert(parsed);
  if (error) return { error: error.message };
  revalidatePath("/standards");
  return { ok: true };
}

const requirementSchema = z.object({
  standard_id: z.string().uuid(),
  clause: z.string().min(1),
  title: z.string().min(1),
  requirement_summary: z.string().optional(),
  evidence_expected: z.string().optional(),
});

export async function createRequirementAction(formData: FormData) {
  const parsed = requirementSchema.parse(Object.fromEntries(formData));
  const supabase = await createServerClient();
  const { error } = await supabase.from("standard_requirement").insert(parsed);
  if (error) return { error: error.message };
  revalidatePath("/standards");
  return { ok: true };
}
