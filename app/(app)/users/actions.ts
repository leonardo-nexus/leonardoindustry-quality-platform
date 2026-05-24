"use server";
import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/audit/audit-log";

export async function createUserAction(formData: FormData) {
  const session = await requireSession();
  if (!session.person) return { error: "Profilo persona mancante" };

  const first_name = (formData.get("first_name") as string)?.trim();
  const last_name = (formData.get("last_name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const company_id = (formData.get("company_id") as string) || null;
  const role_code = (formData.get("role_code") as string)?.trim();
  const locale = (formData.get("locale") as string) || "it";
  if (!first_name || !last_name || !email || !company_id || !role_code) {
    return { error: "Tutti i campi obbligatori vanno compilati" };
  }

  const admin = createServiceRoleClient();
  // Trova role_id
  const { data: role } = await admin.from("role").select("id").eq("code", role_code).maybeSingle();
  if (!role) return { error: "Ruolo non valido" };

  // Crea person (auth_user_id può essere collegato dopo invito Supabase)
  const { data: created, error } = await admin
    .from("person")
    .insert({
      first_name, last_name, email,
      company_id, role_id: role.id, locale,
      active: true,
      created_by: session.person.id,
      updated_by: session.person.id,
    })
    .select("id")
    .single();
  if (error || !created) return { error: error?.message ?? "Insert fallito" };

  await writeAuditLog({
    entity_type: "person",
    entity_id: created.id,
    action: "create",
    new_values: { first_name, last_name, email, role_code, locale, company_id },
    reason: "Nuovo utente creato",
  });

  revalidatePath("/users");
  return { ok: true, id: created.id };
}

export async function updateUserAction(personId: string, formData: FormData) {
  const session = await requireSession();
  if (!session.person) return { error: "Profilo persona mancante" };
  const admin = createServiceRoleClient();

  const { data: prev } = await admin.from("person").select("*").eq("id", personId).maybeSingle();
  if (!prev) return { error: "Utente non trovato" };

  const role_code = (formData.get("role_code") as string)?.trim();
  const locale = (formData.get("locale") as string) || prev.locale;
  const active = formData.get("active") === "1";
  const company_id = (formData.get("company_id") as string) || prev.company_id;

  let role_id = prev.role_id;
  if (role_code) {
    const { data: role } = await admin.from("role").select("id").eq("code", role_code).maybeSingle();
    if (role) role_id = role.id;
  }

  const { data: updated, error } = await admin
    .from("person")
    .update({
      role_id, locale, active, company_id,
      updated_by: session.person.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", personId)
    .select("*")
    .single();
  if (error || !updated) return { error: error?.message ?? "Update fallito" };

  await writeAuditLog({
    entity_type: "person",
    entity_id: personId,
    action: "update",
    old_values: { role_id: prev.role_id, locale: prev.locale, active: prev.active, company_id: prev.company_id },
    new_values: { role_id, locale, active, company_id },
    changed_fields: ["role_id", "locale", "active", "company_id"],
  });

  revalidatePath(`/users/${personId}`);
  revalidatePath("/users");
  return { ok: true };
}

export async function toggleUserActiveAction(personId: string, makeActive: boolean) {
  const session = await requireSession();
  if (!session.person) return { error: "Profilo persona mancante" };
  const admin = createServiceRoleClient();
  await admin.from("person").update({
    active: makeActive,
    updated_by: session.person.id,
    updated_at: new Date().toISOString(),
  }).eq("id", personId);
  await writeAuditLog({
    entity_type: "person",
    entity_id: personId,
    action: makeActive ? "restore" : "archive",
    reason: makeActive ? "Riattivazione utente" : "Disattivazione utente",
  });
  revalidatePath(`/users/${personId}`);
  revalidatePath("/users");
  return { ok: true };
}

export async function addTeamMemberAction(teamId: string, personId: string, teamRole: string) {
  const session = await requireSession();
  if (!session.person) return { error: "Profilo persona mancante" };
  const admin = createServiceRoleClient();
  const { error } = await admin.from("team_member").insert({
    team_id: teamId, person_id: personId, team_role: teamRole,
    created_by: session.person.id,
  });
  if (error) return { error: error.message };
  await writeAuditLog({ entity_type: "team_member", entity_id: teamId, action: "assign", reason: `Aggiunto a team ${teamRole}` });
  revalidatePath(`/users/${personId}`);
  return { ok: true };
}
