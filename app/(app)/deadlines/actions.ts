"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/server";

const TASK_SOURCE = ["documento","audit","non_conformita","azione_correttiva","formazione","visita_medica","fornitore","strumento","veicolo","saldatura","wps","wpqr","qualifica_saldatore","cantiere","ambiente","sicurezza","altro"] as const;
const TASK_STATUS = ["aperta","in_corso","scaduta","chiusa","verificata"] as const;
const TASK_PRIORITY = ["bassa","media","alta","critica"] as const;

const taskSchema = z.object({
  company_id: z.string().uuid(),
  site_id: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
  process_id: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
  source_type: z.enum(TASK_SOURCE),
  title: z.string().min(1),
  description: z.string().optional(),
  responsible_id: z.string().uuid(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  priority: z.enum(TASK_PRIORITY).default("media"),
  status: z.enum(TASK_STATUS).default("aperta"),
  blocks_operations: z.coerce.boolean().default(false),
});

export async function createTaskAction(formData: FormData) {
  const raw = Object.fromEntries(formData);
  const parsed = taskSchema.parse(raw);
  const supabase = await createServerClient();
  const { data: task, error } = await supabase.from("task").insert(parsed).select("id").single();
  if (error) return { error: error.message };

  // Auto-genera reminder a 30, 7 e 1 giorno
  const due = new Date(parsed.due_date);
  const reminders = [30, 7, 1].map((d) => {
    const dt = new Date(due);
    dt.setDate(dt.getDate() - d);
    return { task_id: task.id, remind_at: dt.toISOString(), channel: "app" };
  });
  await supabase.from("reminder").insert(reminders);

  revalidatePath("/deadlines");
  redirect("/deadlines");
}

export async function updateTaskStatusAction(id: string, status: typeof TASK_STATUS[number]) {
  const supabase = await createServerClient();
  const patch: Record<string, unknown> = { status };
  if (status === "chiusa" || status === "verificata") {
    patch.closed_at = new Date().toISOString();
  }
  const { error } = await supabase.from("task").update(patch).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/deadlines");
  return { ok: true };
}
