"use server";
import { headers } from "next/headers";
import { createServerClient } from "@/lib/supabase/server";

export async function sendRecoveryEmailAction(email: string) {
  if (!email) return { error: "Email richiesta" };
  const supabase = await createServerClient();
  const h = await headers();
  const origin = h.get("origin") ?? "http://localhost:3000";
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?type=recovery`,
  });
  if (error) return { error: error.message };
  return { ok: true };
}
