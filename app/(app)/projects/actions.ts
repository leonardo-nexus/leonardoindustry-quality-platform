"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/server";

const projectSchema = z.object({
  company_id: z.string().uuid(),
  site_id: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
  code: z.string().min(1),
  name: z.string().min(1),
  customer_name: z.string().optional(),
  project_manager_id: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
  execution_class_id: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("").transform(() => undefined)),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("").transform(() => undefined)),
  status: z.enum(["aperta","in_corso","sospesa","chiusa","annullata"]).default("aperta"),
  notes: z.string().optional(),
});

export async function createProjectAction(formData: FormData) {
  const parsed = projectSchema.parse(Object.fromEntries(formData));
  const supabase = await createServerClient();
  const { error } = await supabase.from("project").insert(parsed);
  if (error) return { error: error.message };
  revalidatePath("/projects");
  redirect("/projects");
}

const drawingSchema = z.object({
  project_id: z.string().uuid(),
  code: z.string().min(1),
  revision: z.string().min(1),
  title: z.string().optional(),
  status: z.enum(["bozza","in_revisione","attivo","sospeso","obsoleto","archiviato"]).default("bozza"),
});

export async function createDrawingAction(formData: FormData) {
  const parsed = drawingSchema.parse(Object.fromEntries(formData));
  const supabase = await createServerClient();
  const { error } = await supabase.from("drawing").insert(parsed);
  if (error) return { error: error.message };
  revalidatePath(`/projects/${parsed.project_id}`);
  return { ok: true };
}

export async function approveDrawingAction(drawingId: string, personId: string, projectId: string) {
  const supabase = await createServerClient();
  const { error } = await supabase
    .from("drawing")
    .update({
      status: "attivo",
      approved_by: personId,
      approved_at: new Date().toISOString().slice(0, 10),
    })
    .eq("id", drawingId);
  if (error) return { error: error.message };
  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}
