"use server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";
import { LOCALE_COOKIE, isLocale } from "@/lib/i18n/config";

export async function setLocaleAction(locale: string) {
  if (!isLocale(locale)) return { error: "Locale non supportata" };

  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE, locale, {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });

  // Persisti anche su person se loggato (best-effort)
  try {
    const session = await requireSession();
    if (session.person?.id) {
      const admin = createServiceRoleClient();
      await admin.from("person").update({ locale }).eq("id", session.person.id);
    }
  } catch {}

  revalidatePath("/", "layout");
  return { ok: true };
}
