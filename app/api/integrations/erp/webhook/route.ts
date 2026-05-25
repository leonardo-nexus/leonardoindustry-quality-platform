import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { verifyErpRequest } from "@/lib/integration/hmac";
import { syncMasterDataFromErp, type MasterDataPayload } from "@/lib/integration/master-data-sync";

/**
 * ERP master-data webhook.
 *
 * ERP is the master for customer/supplier identity data.
 * Quality keeps the operational intelligence: supplier qualification, scores,
 * blocks, customer experience score, reviews, warnings and strategic notes.
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
      success: false,
      http_status: 401,
      error_message: verify.error,
      idempotency_key: idempotencyKey,
      remote_ip: remoteIp,
      duration_ms: Date.now() - t0,
    });
    return NextResponse.json({ error: verify.error }, { status: 401 });
  }

  let parsed: MasterDataPayload;
  try {
    parsed = JSON.parse(body) as MasterDataPayload;
  } catch {
    return NextResponse.json({ error: "Body non JSON" }, { status: 400 });
  }

  if (!parsed.action || !parsed.global_id) {
    return NextResponse.json({ error: "action + global_id obbligatori" }, { status: 400 });
  }

  const { data: existing } = await admin
    .from("sync_log")
    .select("id")
    .eq("idempotency_key", idempotencyKey)
    .eq("direction", "inbound")
    .limit(1)
    .maybeSingle();
  if (existing) return NextResponse.json({ ok: true, deduplicated: true });

  const result = await syncMasterDataFromErp(admin, parsed);

  await admin.from("sync_log").insert({
    direction: "inbound",
    source_app: "erp",
    entity_type: result.entity === "customer" ? "customer" : "supplier_qualification",
    entity_id: result.quality_id,
    global_id: parsed.global_id,
    action: parsed.action,
    request_payload: parsed,
    response_payload: result,
    success: true,
    http_status: 200,
    idempotency_key: idempotencyKey,
    remote_ip: remoteIp,
    duration_ms: Date.now() - t0,
  });

  return NextResponse.json({ ok: true, ...result });
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
