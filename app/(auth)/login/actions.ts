"use server";
import { createServerClient } from "@/lib/supabase/server";

interface SignInInput {
  email: string;
  password: string;
  redirectTo?: string;
}

export async function signInAction({ email, password, redirectTo }: SignInInput) {
  const supabase = await createServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };
  return { redirect: redirectTo && redirectTo.startsWith("/") ? redirectTo : "/dashboard" };
}

export async function signOutAction() {
  const supabase = await createServerClient();
  await supabase.auth.signOut();
  return { ok: true };
}
