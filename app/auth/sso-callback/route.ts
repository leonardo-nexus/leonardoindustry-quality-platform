import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

type SsoPayload = {
  global_person_id?: string;
  email?: string;
  name?: string;
  app?: string;
  exp?: number;
  return_to?: string;
};

function base64UrlDecode(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Buffer.from(padded, "base64").toString("utf8");
}

function verifyToken(token: string, secret: string): SsoPayload {
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) throw new Error("Token SSO non valido");

  const expected = createHmac("sha256", secret).update(encodedPayload).digest("base64url");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new Error("Firma SSO non valida");

  const payload = JSON.parse(base64UrlDecode(encodedPayload)) as SsoPayload;
  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) throw new Error("Token SSO scaduto");
  if (payload.app && payload.app !== "quality") throw new Error("Token SSO non destinato a Quality");
  if (!payload.global_person_id && !payload.email) throw new Error("Token SSO senza identita");
  return payload;
}

function safeReturnTo(value: string | null | undefined, requestOrigin: string) {
  if (!value) return "/dashboard";
  try {
    if (value.startsWith("/")) return value;
    const url = new URL(value);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ? new URL(process.env.NEXT_PUBLIC_APP_URL) : null;
    if (url.origin === requestOrigin || (appUrl && url.origin === appUrl.origin)) {
      return `${url.pathname}${url.search}${url.hash}`;
    }
  } catch {
    return "/dashboard";
  }
  return "/dashboard";
}

async function findAuthUserByEmail(admin: ReturnType<typeof createServiceRoleClient>, email: string) {
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) return null;
    const found = data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
    if (found) return found;
    if (data.users.length < 1000) return null;
  }
  return null;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token = searchParams.get("token");
  const secret = process.env.QUALITY_SSO_SECRET ?? process.env.QUALITY_INTEGRATION_SECRET;

  if (!token || !secret) {
    return NextResponse.redirect(`${origin}/login?local=1&error=${encodeURIComponent("SSO ERP non configurato")}`);
  }

  try {
    const payload = verifyToken(token, secret);
    const returnTo = safeReturnTo(payload.return_to ?? searchParams.get("return_to"), origin);
    const admin = createServiceRoleClient();

    const { data: personByGlobal } = payload.global_person_id
      ? await admin
          .from("person")
          .select("id, email, first_name, last_name, active, auth_user_id, global_person_id")
          .eq("active", true)
          .eq("global_person_id", payload.global_person_id)
          .maybeSingle()
      : { data: null };

    const { data: personByEmail } = !personByGlobal && payload.email
      ? await admin
          .from("person")
          .select("id, email, first_name, last_name, active, auth_user_id, global_person_id")
          .eq("active", true)
          .ilike("email", payload.email)
          .maybeSingle()
      : { data: null };

    const person = personByGlobal ?? personByEmail;
    if (!person) throw new Error("Persona Quality non trovata per questa identita ERP");

    const email = (person.email ?? payload.email)?.toLowerCase();
    if (!email) throw new Error("Email mancante sulla persona Quality");

    let authUserId = person.auth_user_id as string | null;
    if (!authUserId) {
      const existingUser = await findAuthUserByEmail(admin, email);
      if (existingUser) {
        authUserId = existingUser.id;
      } else {
        const { data: created, error: createError } = await admin.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: {
            full_name: payload.name ?? `${person.first_name ?? ""} ${person.last_name ?? ""}`.trim(),
            global_person_id: person.global_person_id ?? payload.global_person_id ?? null,
          },
          app_metadata: {
            global_person_id: person.global_person_id ?? payload.global_person_id ?? null,
            source_app: "erp",
          },
        });
        if (createError || !created.user) throw new Error(createError?.message ?? "Creazione auth user Quality fallita");
        authUserId = created.user.id;
      }

      await admin.from("person").update({ auth_user_id: authUserId }).eq("id", person.id);
    }

    const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(returnTo)}`;
    const { data: link, error: linkError } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo },
    });
    const actionLink = link?.properties?.action_link;
    if (linkError || !actionLink) throw new Error(linkError?.message ?? "Creazione sessione SSO fallita");

    return NextResponse.redirect(actionLink);
  } catch (error) {
    return NextResponse.redirect(`${origin}/login?local=1&error=${encodeURIComponent((error as Error).message)}`);
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
