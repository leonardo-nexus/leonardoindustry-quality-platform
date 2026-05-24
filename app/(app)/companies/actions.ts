"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/server";

const companySchema = z.object({
  name: z.string().min(1, "Nome richiesto"),
  legal_name: z.string().optional(),
  country: z.string().optional(),
  tax_id: z.string().optional(),
  vat_id: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  active: z.coerce.boolean().default(true),
});

const GROUP_ID = "00000000-0000-0000-0000-000000000001";

export async function createCompanyAction(formData: FormData) {
  const parsed = companySchema.parse(Object.fromEntries(formData));
  const supabase = await createServerClient();
  const { error } = await supabase.from("company").insert({ ...parsed, group_id: GROUP_ID });
  if (error) return { error: error.message };
  revalidatePath("/companies");
  redirect("/companies");
}

export async function updateCompanyAction(id: string, formData: FormData) {
  const parsed = companySchema.parse(Object.fromEntries(formData));
  const supabase = await createServerClient();
  const { error } = await supabase.from("company").update(parsed).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/companies");
  redirect("/companies");
}

const siteSchema = z.object({
  company_id: z.string().uuid(),
  type: z.enum(["sede", "officina", "cantiere", "magazzino"]),
  name: z.string().min(1),
  address: z.string().optional(),
  notes: z.string().optional(),
});

export async function createSiteAction(formData: FormData) {
  const parsed = siteSchema.parse(Object.fromEntries(formData));
  const supabase = await createServerClient();
  const { error } = await supabase.from("site").insert(parsed);
  if (error) return { error: error.message };
  revalidatePath(`/companies/${parsed.company_id}`);
  return { ok: true };
}

export async function uploadCompanyLogoAction(formData: FormData) {
  const companyId = String(formData.get("company_id") ?? "");
  const file = formData.get("file") as File | null;
  if (!companyId || !file) return { error: "company_id e file richiesti" };
  if (file.size > 5 * 1024 * 1024) return { error: "Logo troppo grande (max 5 MB)" };

  const supabase = await createServerClient();
  const ext = (file.name.split(".").pop() ?? "png").toLowerCase();
  const storagePath = `${companyId}/logo.${ext}`;
  const buf = await file.arrayBuffer();

  const { error: upErr } = await supabase.storage
    .from("company-logos")
    .upload(storagePath, buf, { contentType: file.type, upsert: true, cacheControl: "3600" });
  if (upErr) return { error: `Upload: ${upErr.message}` };

  const { data: pub } = supabase.storage.from("company-logos").getPublicUrl(storagePath);
  // Aggiungo cache buster per forzare refresh
  const url = `${pub.publicUrl}?t=${Date.now()}`;

  const { error: dbErr } = await supabase.from("company").update({ logo_url: url }).eq("id", companyId);
  if (dbErr) return { error: `DB: ${dbErr.message}` };

  revalidatePath(`/companies/${companyId}`);
  revalidatePath("/companies");
  revalidatePath("/", "layout");
  return { ok: true, url };
}

export async function removeCompanyLogoAction(companyId: string) {
  const supabase = await createServerClient();
  // Tenta la rimozione di tutte le estensioni comuni
  const exts = ["png", "jpg", "jpeg", "svg", "webp"];
  const paths = exts.map((e) => `${companyId}/logo.${e}`);
  await supabase.storage.from("company-logos").remove(paths);
  const { error } = await supabase.from("company").update({ logo_url: null }).eq("id", companyId);
  if (error) return { error: error.message };
  revalidatePath(`/companies/${companyId}`);
  revalidatePath("/companies");
  revalidatePath("/", "layout");
  return { ok: true };
}
