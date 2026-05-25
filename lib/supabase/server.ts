import { createServerClient as createSSRClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export async function createServerClient() {
  const cookieStore = await cookies();
  return createSSRClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Components cannot mutate cookies — refresh happens via middleware
          }
        },
      },
      // BUG FIX (2026-05-25): Next.js 14 fetch caching automatico cacha le response Supabase.
      // Forza no-store per leggere SEMPRE dato fresco lato server.
      global: {
        fetch: (input: RequestInfo | URL, init?: RequestInit) => fetch(input, { ...init, cache: "no-store" }),
      },
    },
  );
}

/**
 * Service-role client (bypassa RLS). Usa @supabase/supabase-js puro invece di @supabase/ssr
 * perché ssr è pensato per user-auth con cookies e applica fetch caching Next.js,
 * causando lettura di dati STALE su server actions / route handlers.
 *
 * IMPORTANTE: questo client viene istanziato a ogni chiamata - no singleton -
 * per evitare connection pool stale.
 */
export function createServiceRoleClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      // Forza fetch con no-store: niente cache Next.js sulle query DB
      global: {
        fetch: (input: RequestInfo | URL, init?: RequestInit) => fetch(input, { ...init, cache: "no-store" }),
      },
    },
  );
}
