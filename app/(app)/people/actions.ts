"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/server";

const personSchema = z.object({
  company_id: z.string().uuid(),
  role_id: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: z.string().email().optional().or(z.literal("").transform(() => undefined)),
  phone: z.string().optional(),
  notes: z.string().optional(),
  auth_user_id: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
});

export async function createPersonAction(formData: FormData) {
  const parsed = personSchema.parse(Object.fromEntries(formData));
  const supabase = await createServerClient();
  const { error } = await supabase.from("person").insert(parsed);
  if (error) return { error: error.message };
  revalidatePath("/people");
  redirect("/people");
}

const competenceLinkSchema = z.object({
  person_id: z.string().uuid(),
  competence_id: z.string().uuid(),
  issue_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("").transform(() => undefined)),
  expiry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("").transform(() => undefined)),
  status: z.enum(["valida","in_scadenza","scaduta","sospesa"]).default("valida"),
  notes: z.string().optional(),
});

export async function addPersonCompetenceAction(formData: FormData) {
  const parsed = competenceLinkSchema.parse(Object.fromEntries(formData));
  const supabase = await createServerClient();
  const { error } = await supabase.from("person_competence").insert(parsed);
  if (error) return { error: error.message };
  revalidatePath(`/people/${parsed.person_id}`);
  return { ok: true };
}
