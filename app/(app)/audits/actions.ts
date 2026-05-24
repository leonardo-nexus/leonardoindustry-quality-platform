"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/server";

const auditSchema = z.object({
  company_id: z.string().uuid(),
  site_id: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
  standard_id: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
  process_id: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
  code: z.string().optional(),
  audit_type: z.enum(["interno","esterno","cliente","fornitore","fpc"]),
  planned_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  lead_auditor_id: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
  scope: z.string().optional(),
  notes: z.string().optional(),
});

export async function createAuditAction(formData: FormData) {
  const parsed = auditSchema.parse(Object.fromEntries(formData));
  const supabase = await createServerClient();
  const { error } = await supabase.from("audit").insert(parsed);
  if (error) return { error: error.message };
  revalidatePath("/audits");
  redirect("/audits");
}

const findingSchema = z.object({
  audit_id: z.string().uuid(),
  finding_type: z.enum(["osservazione","raccomandazione","non_conformita_minore","non_conformita_maggiore","punto_forte"]),
  description: z.string().min(1),
});

export async function createFindingAction(formData: FormData) {
  const parsed = findingSchema.parse(Object.fromEntries(formData));
  const supabase = await createServerClient();
  const { data: finding, error } = await supabase.from("audit_finding").insert(parsed).select("id").single();
  if (error) return { error: error.message };

  // Se è una NC, apri automaticamente NC collegata
  if (parsed.finding_type.startsWith("non_conformita")) {
    const { data: audit } = await supabase.from("audit").select("company_id, process_id").eq("id", parsed.audit_id).single();
    if (audit) {
      const severity = parsed.finding_type === "non_conformita_maggiore" ? "maggiore" : "minore";
      await supabase.from("non_conformity").insert({
        company_id: audit.company_id,
        process_id: audit.process_id,
        audit_id: parsed.audit_id,
        finding_id: finding.id,
        title: parsed.description.slice(0, 100),
        description: parsed.description,
        severity,
      });
    }
  }

  revalidatePath(`/audits/${parsed.audit_id}`);
  return { ok: true };
}

export async function setAuditExecutedAction(id: string) {
  const supabase = await createServerClient();
  const { error } = await supabase
    .from("audit")
    .update({ status: "eseguito", executed_date: new Date().toISOString().slice(0, 10) })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/audits/${id}`);
  return { ok: true };
}
