import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { verifyErpRequest } from "@/lib/integration/hmac";

/**
 * POST /api/integrations/erp/identity-upsert
 *
 * Endpoint receiver chiamato dall'UI ERP /admin/identity/new (server action).
 * Riceve payload identity canonica e predispone person Quality con global_person_id.
 *
 * NON crea auth.users Quality (Fase 3 Identity Bridge: login Quality intatto).
 * Crea person Quality come placeholder (auth_user_id=NULL) finché Fase C SSO non attiva.
 *
 * Auth: HMAC-SHA256 con QUALITY_INTEGRATION_SECRET (stesso schema webhook esistente).
 *
 * Body atteso:
 * {
 *   "action": "identity.upsert",
 *   "global_person_id": "uuid",
 *   "email": "x@y.it",
 *   "first_name": "Costela",
 *   "last_name": "Florea",
 *   "preferred_locale": "it",
 *   "quality_company_global_id": "uuid-erp-company-shared",
 *   "quality_role_code": "responsabile_qualita",
 *   "quality_scope": "company",
 *   "status": "active"
 * }
 */
export async function POST(req: NextRequest) {
  const t0 = Date.now();
  const body = await req.text();
  const timestamp = req.headers.get("x-timestamp");
  const signature = req.headers.get("x-signature");
  const idempotencyKey = req.headers.get("x-idempotency-key");
  const remoteIp = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip");

  const verify = verifyErpRequest({
    timestamp,
    signature,
    idempotencyKey,
    body,
    secret: process.env.QUALITY_INTEGRATION_SECRET,
  });

  const admin = createServiceRoleClient();
  if (!verify.ok) {
    await admin.from("sync_log").insert({
      direction: "inbound",
      source_app: "erp",
      action: "identity.upsert",
      success: false,
      http_status: 401,
      error_message: verify.error,
      idempotency_key: idempotencyKey,
      remote_ip: remoteIp,
      duration_ms: Date.now() - t0,
    });
    return NextResponse.json({ error: verify.error }, { status: 401 });
  }

  let parsed: any;
  try {
    parsed = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Body non JSON" }, { status: 400 });
  }

  const {
    action,
    global_person_id,
    email,
    first_name,
    last_name,
    preferred_locale,
    quality_company_global_id,
    quality_role_code,
    quality_scope,
    status,
  } = parsed;

  if (action !== "identity.upsert") {
    return NextResponse.json({ error: "action deve essere identity.upsert" }, { status: 400 });
  }
  if (!global_person_id || !email || !first_name || !last_name) {
    return NextResponse.json({ error: "Campi obbligatori: global_person_id, email, first_name, last_name" }, { status: 400 });
  }

  // Idempotency: se idem-key già visto, no-op
  const { data: dup } = await admin
    .from("sync_log")
    .select("id")
    .eq("idempotency_key", idempotencyKey ?? "__none__")
    .eq("direction", "inbound")
    .limit(1)
    .maybeSingle();
  if (dup) {
    return NextResponse.json({ ok: true, deduplicated: true });
  }

  // Lookup company Quality via global_id
  let qualityCompanyId: string | null = null;
  if (quality_company_global_id) {
    const { data: comp } = await admin
      .from("company")
      .select("id")
      .eq("global_id", quality_company_global_id)
      .maybeSingle();
    qualityCompanyId = comp?.id ?? null;
  }
  if (!qualityCompanyId) {
    // Fallback: prima company attiva (per evitare blocco totale)
    const { data: anyComp } = await admin
      .from("company")
      .select("id")
      .eq("active", true)
      .order("name")
      .limit(1)
      .maybeSingle();
    qualityCompanyId = anyComp?.id ?? null;
  }

  if (!qualityCompanyId) {
    return NextResponse.json({ error: "Nessuna company Quality disponibile" }, { status: 500 });
  }

  // Lookup role_id Quality dal role_code
  let roleId: string | null = null;
  if (quality_role_code) {
    const { data: role } = await admin
      .from("role")
      .select("id")
      .eq("code", quality_role_code)
      .maybeSingle();
    roleId = role?.id ?? null;
  }

  // Upsert person Quality (cerca per global_person_id, oppure crea nuova)
  const { data: existing } = await admin
    .from("person")
    .select("id")
    .eq("global_person_id", global_person_id)
    .maybeSingle();

  let personId: string;
  let createdNew = false;

  if (existing) {
    // UPDATE (riallinea role/company se cambiato lato ERP)
    await admin
      .from("person")
      .update({
        first_name,
        last_name,
        email,
        locale: preferred_locale ?? "it",
        company_id: qualityCompanyId,
        role_id: roleId,
        active: status === "active",
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    personId = existing.id;
  } else {
    // INSERT person placeholder (no auth_user_id)
    const { data: created, error: insErr } = await admin
      .from("person")
      .insert({
        company_id: qualityCompanyId,
        role_id: roleId,
        first_name,
        last_name,
        email,
        locale: preferred_locale ?? "it",
        active: status === "active",
        auth_user_id: null,
        global_person_id,
        notes: `Predisposta via ERP /admin/identity/new il ${new Date().toISOString()}. auth_user_id=NULL: login Quality non attivo finche' Fase C SSO non parte.`,
      })
      .select("id")
      .single();
    if (insErr || !created) {
      return NextResponse.json({ error: insErr?.message ?? "INSERT person fallito" }, { status: 500 });
    }
    personId = created.id;
    createdNew = true;
  }

  // Log inbound sync
  await admin.from("sync_log").insert({
    direction: "inbound",
    source_app: "erp",
    entity_type: "person",
    entity_id: personId,
    global_id: global_person_id,
    action: "identity.upsert",
    request_payload: parsed,
    success: true,
    http_status: 200,
    response_payload: { person_id: personId, created_new: createdNew, role_id: roleId, company_id: qualityCompanyId },
    idempotency_key: idempotencyKey,
    remote_ip: remoteIp,
    duration_ms: Date.now() - t0,
  });

  return NextResponse.json({
    ok: true,
    person_id: personId,
    created_new: createdNew,
    role_id: roleId,
    company_id: qualityCompanyId,
    note: "Person Quality predisposta. auth_user_id=NULL: login Quality non attivo finche' Fase C SSO Bridge non parte.",
  });
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
