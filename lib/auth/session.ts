import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import type { AppRole } from "./roles";

export interface SessionContext {
  userId: string;
  email: string | null;
  person: {
    id: string;
    first_name: string;
    last_name: string;
    company_id: string;
    role_code: AppRole | null;
  } | null;
}

export async function requireSession(): Promise<SessionContext> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: person } = await supabase
    .from("person")
    .select("id, first_name, last_name, company_id, role:role_id(code)")
    .eq("auth_user_id", user.id)
    .eq("active", true)
    .maybeSingle();

  return {
    userId: user.id,
    email: user.email ?? null,
    person: person
      ? {
          id: person.id,
          first_name: person.first_name,
          last_name: person.last_name,
          company_id: person.company_id,
          role_code: (Array.isArray(person.role) ? person.role[0]?.code : (person.role as any)?.code) ?? null,
        }
      : null,
  };
}
