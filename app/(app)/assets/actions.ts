"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/server";

const assetSchema = z.object({
  company_id: z.string().uuid(),
  site_id: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
  asset_type: z.enum(["strumento_misura","saldatrice","attrezzatura","veicolo","estintore","dpi","macchina_officina","altro"]),
  code: z.string().min(1),
  serial_number: z.string().optional(),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(["disponibile","assegnato","fuori_servizio","dismesso"]).default("disponibile"),
});

export async function createAssetAction(formData: FormData) {
  const parsed = assetSchema.parse(Object.fromEntries(formData));
  const supabase = await createServerClient();
  const { error } = await supabase.from("asset").insert(parsed);
  if (error) return { error: error.message };
  revalidatePath("/assets");
  redirect("/assets");
}

const eventSchema = z.object({
  asset_id: z.string().uuid(),
  event_type: z.enum(["taratura","verifica","manutenzione","revisione","riparazione","fuori_servizio","rientro_servizio"]),
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  next_due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("").transform(() => undefined)),
  performed_by: z.string().optional(),
  result: z.enum(["conforme","non_conforme","limitato"]).optional().or(z.literal("").transform(() => undefined)),
  notes: z.string().optional(),
});

export async function createAssetEventAction(formData: FormData) {
  const parsed = eventSchema.parse(Object.fromEntries(formData));
  const supabase = await createServerClient();
  const { error } = await supabase.from("asset_event").insert(parsed);
  if (error) return { error: error.message };
  // Aggiorna stato asset in base al tipo evento
  if (parsed.event_type === "fuori_servizio") {
    await supabase.from("asset").update({ status: "fuori_servizio" }).eq("id", parsed.asset_id);
  } else if (parsed.event_type === "rientro_servizio") {
    await supabase.from("asset").update({ status: "disponibile" }).eq("id", parsed.asset_id);
  }
  revalidatePath(`/assets/${parsed.asset_id}`);
  return { ok: true };
}
