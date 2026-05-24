"use server";
import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";

export async function markRecipientReadAction(recipientId: string) {
  const supabase = await createServerClient();
  const { error } = await supabase
    .from("notification_recipient")
    .update({ read_at: new Date().toISOString() })
    .eq("id", recipientId);
  if (error) return { error: error.message };
  revalidatePath("/notifications");
  return { ok: true };
}
