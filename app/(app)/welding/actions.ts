"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/server";

const wpsSchema = z.object({
  company_id: z.string().uuid(),
  code: z.string().min(1),
  revision: z.string().min(1),
  welding_process_id: z.string().uuid(),
  material_group: z.string().optional(),
  thickness_min_mm: z.coerce.number().optional().or(z.literal("").transform(() => undefined)),
  thickness_max_mm: z.coerce.number().optional().or(z.literal("").transform(() => undefined)),
  position_range: z.string().optional(),
  status: z.enum(["bozza","valida","sospesa","obsoleta"]).default("bozza"),
});

export async function createWpsAction(formData: FormData) {
  const parsed = wpsSchema.parse(Object.fromEntries(formData));
  const supabase = await createServerClient();
  const { error } = await supabase.from("wps").insert(parsed);
  if (error) return { error: error.message };
  revalidatePath("/welding/wps");
  redirect("/welding/wps");
}

const wpqrSchema = z.object({
  wps_id: z.string().uuid(),
  certificate_code: z.string().min(1),
  issue_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("").transform(() => undefined)),
  expiry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("").transform(() => undefined)),
  status: z.enum(["valida","scaduta","sospesa"]).default("valida"),
});

export async function createWpqrAction(formData: FormData) {
  const parsed = wpqrSchema.parse(Object.fromEntries(formData));
  const supabase = await createServerClient();
  const { error } = await supabase.from("wpqr").insert(parsed);
  if (error) return { error: error.message };
  revalidatePath("/welding/wpqr");
  return { ok: true };
}

const welderSchema = z.object({
  person_id: z.string().uuid(),
  welding_process_id: z.string().uuid(),
  certificate_code: z.string().min(1),
  material_group: z.string().optional(),
  thickness_min_mm: z.coerce.number().optional().or(z.literal("").transform(() => undefined)),
  thickness_max_mm: z.coerce.number().optional().or(z.literal("").transform(() => undefined)),
  position_range: z.string().optional(),
  issue_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("").transform(() => undefined)),
  expiry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(["valida","in_scadenza","scaduta","sospesa"]).default("valida"),
});

export async function createWelderQualificationAction(formData: FormData) {
  const parsed = welderSchema.parse(Object.fromEntries(formData));
  const supabase = await createServerClient();
  const { error } = await supabase.from("welder_qualification").insert(parsed);
  if (error) return { error: error.message };
  revalidatePath("/welding/welders");
  return { ok: true };
}

const materialSchema = z.object({
  company_id: z.string().uuid(),
  project_id: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
  heat_number: z.string().optional(),
  material_grade: z.string().min(1),
  thickness_mm: z.coerce.number().optional().or(z.literal("").transform(() => undefined)),
  status: z.enum(["disponibile","usato","bloccato","non_conforme"]).default("disponibile"),
});

export async function createMaterialAction(formData: FormData) {
  const parsed = materialSchema.parse(Object.fromEntries(formData));
  const supabase = await createServerClient();
  const { error } = await supabase.from("material_lot").insert(parsed);
  if (error) return { error: error.message };
  revalidatePath("/welding/materials");
  return { ok: true };
}

const weldSchema = z.object({
  project_id: z.string().uuid(),
  drawing_id: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
  weld_number: z.string().min(1),
  execution_class_id: z.string().uuid(),
  material_lot_id: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
  wps_id: z.string().uuid(),
  welder_id: z.string().uuid(),
  welded_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("").transform(() => undefined)),
  ndt_required: z.coerce.boolean().default(false),
  status: z.enum(["pianificata","autorizzata","eseguita","controllata","non_conforme","accettata"]).default("pianificata"),
  notes: z.string().optional(),
});

export async function createWeldAction(formData: FormData) {
  const parsed = weldSchema.parse(Object.fromEntries(formData));
  const supabase = await createServerClient();
  const { error } = await supabase.from("weld").insert(parsed);
  if (error) return { error: error.message };
  revalidatePath(`/welding/welds`);
  redirect("/welding/welds");
}

export async function authorizeWeldAction(id: string) {
  const supabase = await createServerClient();
  const { error } = await supabase.from("weld").update({ status: "autorizzata" }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/welding/welds/${id}`);
  return { ok: true };
}

export async function setWeldExecutedAction(id: string, date: string) {
  const supabase = await createServerClient();
  const { error } = await supabase.from("weld").update({ status: "eseguita", welded_at: date }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/welding/welds/${id}`);
  return { ok: true };
}

export async function acceptWeldAction(id: string) {
  const supabase = await createServerClient();
  const { error } = await supabase.from("weld").update({ status: "accettata" }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/welding/welds/${id}`);
  return { ok: true };
}

const inspectionSchema = z.object({
  weld_id: z.string().uuid(),
  inspection_type: z.enum(["VT","PT","MT","UT","RT","dimensionale"]),
  inspector_id: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
  inspection_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  result: z.enum(["conforme","non_conforme","limitato"]),
  notes: z.string().optional(),
});

export async function createInspectionAction(formData: FormData) {
  const parsed = inspectionSchema.parse(Object.fromEntries(formData));
  const supabase = await createServerClient();
  const { error } = await supabase.from("weld_inspection").insert(parsed);
  if (error) return { error: error.message };
  // Se non conforme → segna saldatura come non conforme e apri NC
  if (parsed.result === "non_conforme") {
    const { data: weld } = await supabase
      .from("weld")
      .select("project:project_id(company_id), weld_number")
      .eq("id", parsed.weld_id)
      .single();
    await supabase.from("weld").update({ status: "non_conforme" }).eq("id", parsed.weld_id);
    if (weld?.project) {
      await supabase.from("non_conformity").insert({
        company_id: (weld.project as any).company_id,
        title: `Saldatura ${weld.weld_number} non conforme ${parsed.inspection_type}`,
        description: `Controllo ${parsed.inspection_type} ha esito non conforme. ${parsed.notes ?? ""}`,
        severity: "maggiore",
      });
    }
  }
  revalidatePath(`/welding/welds/${parsed.weld_id}`);
  return { ok: true };
}
