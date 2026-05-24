import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";
import type { AppRole } from "@/lib/auth/roles";

export type Scope = "all" | "group" | "company" | "team" | "own" | "assigned";
export type RbacAction = "read" | "create" | "update" | "delete" | "approve" | "assign" | "sign" | "export" | "admin";

export interface PermissionCheck {
  resource: string;
  action: RbacAction;
  /** Per scope='own'/'assigned'/'team' è necessario fornire context */
  context?: {
    company_id?: string | null;
    project_id?: string | null;
    assigned_to_person_id?: string | null;
    team_id?: string | null;
  };
}

const HIGH_ROLES: AppRole[] = ["admin_gruppo", "direzione_gruppo"];

/**
 * Verifica se l'utente corrente ha il permesso richiesto.
 * admin_gruppo passa sempre. Altrimenti consulta role_permission.
 */
export async function hasPermission(check: PermissionCheck): Promise<boolean> {
  const session = await requireSession();
  if (!session.person?.role_code) return false;
  if (session.person.role_code === "admin_gruppo") return true;

  const admin = createServiceRoleClient();
  const { data: perms } = await admin
    .from("role_permission")
    .select("resource, action, scope")
    .eq("role_code", session.person.role_code);

  for (const p of perms ?? []) {
    if (p.resource !== check.resource && p.resource !== "*") continue;
    if (p.action !== check.action && p.action !== "admin") continue;

    // Scope check
    switch (p.scope) {
      case "all":
      case "group":
        return true;
      case "company":
        if (check.context?.company_id === session.person.company_id) return true;
        if (!check.context?.company_id) return true; // lettura generica scope company
        break;
      case "own":
      case "assigned":
        if (check.context?.assigned_to_person_id === session.person.id) return true;
        break;
      case "team":
        // Best-effort: ammette se persona è in team della stessa company
        if (check.context?.company_id === session.person.company_id) return true;
        break;
    }
  }
  return false;
}

/** Verifica role oppure throw redirect a /dashboard */
export async function requireRole(...allowed: AppRole[]) {
  const session = await requireSession();
  if (!session.person?.role_code) throw new Error("Profilo persona mancante");
  if (allowed.includes(session.person.role_code as AppRole)) return session;
  if (session.person.role_code === "admin_gruppo") return session;
  throw new Error(`Permesso negato: ruolo ${session.person.role_code} non in [${allowed.join(",")}]`);
}

/** True se la persona è in uno dei ruoli "alti" gruppo */
export function isHighRole(role: string | null | undefined): boolean {
  return HIGH_ROLES.includes((role ?? "") as AppRole);
}

/**
 * Restituisce gli assignments aperti della persona corrente raggruppati per tipo.
 * Usato da /my-work.
 */
export async function getMyAssignments(personId: string) {
  const admin = createServiceRoleClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: assignments } = await admin
    .from("user_assignment")
    .select("*, project:project_id(code, name), company:company_id(name)")
    .eq("assigned_to_person_id", personId)
    .neq("status", "completata")
    .neq("status", "riassegnata")
    .neq("status", "rifiutata")
    .order("priority", { ascending: false })
    .order("due_date", { ascending: true });

  const today_tasks = (assignments ?? []).filter((a: any) => a.due_date && a.due_date === today);
  const overdue = (assignments ?? []).filter((a: any) => a.due_date && a.due_date < today);
  const upcoming = (assignments ?? []).filter((a: any) => !a.due_date || a.due_date > today);

  return { all: assignments ?? [], today: today_tasks, overdue, upcoming };
}

/**
 * Crea un assignment programmaticamente.
 */
export async function createAssignment(opts: {
  company_id: string;
  project_id?: string | null;
  assigned_to_person_id: string;
  entity_type: string;
  entity_id: string;
  assignment_type: "task" | "checklist" | "request" | "block" | "review" | "signature" | "correction" | "reception" | "approval" | "audit";
  priority?: "bassa" | "normale" | "alta" | "urgente" | "critica";
  due_date?: string | null;
  notes?: string | null;
}) {
  const session = await requireSession();
  const admin = createServiceRoleClient();
  const { error } = await admin.from("user_assignment").insert({
    ...opts,
    assigned_by_person_id: session.person?.id ?? null,
    priority: opts.priority ?? "normale",
  });
  if (error) throw new Error(error.message);
}
