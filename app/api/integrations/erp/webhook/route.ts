import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { verifyErpRequest } from "@/lib/integration/hmac";

/**
 * Webhook ricevuto da ERP. Aggiorna anagrafica fornitore in Quality SENZA sovrascrivere
 * campi qualifica (quality_id, score, qualification_status, blocked_for_orders).
 * Se rileva modifica simultanea stesso campo → registra sync_conflict.
 *
 * Headers richiesti:
 * - X-Timestamp: epoch seconds
 * - X-Signature: HMAC-SHA256 di `${timestamp}.${body}` con QUALITY_INTEGRATION_SECRET
 * - X-Idempotency-Key
 *
 * Body atteso (esempio):
 * {
 *   "action": "supplier.updated",
 *   "global_id": "...",
 *   "erp_supplier_id": "SUP-12345",
 *   "fields": { "email": "nuova@x.it", "phone": "..." }
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
    timestamp, signature, idempotencyKey, body,
    secret: process.env.QUALITY_INTEGRATION_SECRET,
  });

  const admin = createServiceRoleClient();
  if (!verify.ok) {
    await admin.from("sync_log").insert({
      direction: "inbound", source_app: "erp",
      success: false, http_status: 401, error_message: verify.error,
      idempotency_key: idempotencyKey, remote_ip: remoteIp,
      duration_ms: Date.now() - t0,
    });
    return NextResponse.json({ error: verify.error }, { status: 401 });
  }

  let parsed: any;
  try { parsed = JSON.parse(body); }
  catch { return NextResponse.json({ error: "Body non JSON" }, { status: 400 }); }

  const { action, global_id, erp_supplier_id, fields } = parsed;
  if (!action || !global_id) return NextResponse.json({ error: "action + global_id obbligatori" }, { status: 400 });

  // Idempotency check
  const { data: existing } = await admin.from("sync_log").select("id").eq("idempotency_key", idempotencyKey).eq("direction", "inbound").limit(1).maybeSingle();
  if (existing) {
    return NextResponse.json({ ok: true, deduplicated: true });
  }

  // Trova qualifica via global_id o erp_supplier_id
  const { data: qual } = await admin
    .from("supplier_qualification")
    .select("*")
    .or(`global_id.eq.${global_id},erp_supplier_id.eq.${erp_supplier_id ?? "__none__"}`)
    .limit(1)
    .maybeSingle();

  if (!qual) {
    // Crea nuova qualifica con dati ERP (senza qualifica Quality)
    const { data: created } = await admin.from("supplier_qualification").insert({
      company_id: parsed.company_id ?? null,
      supplier_name: fields?.legal_name ?? fields?.supplier_name ?? "ERP Import",
      legal_name: fields?.legal_name ?? "Imported from ERP",
      tax_id: fields?.tax_id ?? null,
      email: fields?.email ?? null,
      phone: fields?.phone ?? null,
      address: fields?.address ?? null,
      country: fields?.country ?? null,
      global_id,
      erp_supplier_id,
      source_app: "erp",
      sync_status: "synced",
      last_synced_at: new Date().toISOString(),
    }).select("id").single();
    await admin.from("sync_log").insert({
      direction: "inbound", source_app: "erp",
      entity_type: "supplier_qualification", entity_id: created?.id, global_id, action,
      request_payload: parsed, success: true, http_status: 201,
      idempotency_key: idempotencyKey, remote_ip: remoteIp, duration_ms: Date.now() - t0,
    });
    return NextResponse.json({ ok: true, created: true, quality_id: created?.id });
  }

  // ATTENZIONE: non sovrascrivere campi qualifica Quality
  const PROTECTED_FIELDS = ["score", "qualification_status", "blocked_for_orders", "block_reasons", "score_breakdown", "valid_until", "approved_by", "approved_at"];
  const conflicts: string[] = [];
  const safeUpdates: Record<string, unknown> = {};

  for (const [k, v] of Object.entries(fields ?? {})) {
    if (PROTECTED_FIELDS.includes(k)) {
      // Se ERP cerca di scrivere campo qualifica → conflitto
      if (JSON.stringify(qual[k]) !== JSON.stringify(v)) {
        conflicts.push(k);
        await admin.from("sync_conflict").insert({
          entity_type: "supplier_qualification", entity_id: qual.id, global_id,
          field_name: k,
          quality_value: qual[k], erp_value: v,
        });
      }
    } else {
      safeUpdates[k] = v;
    }
  }

  if (Object.keys(safeUpdates).length > 0) {
    safeUpdates.last_synced_at = new Date().toISOString();
    safeUpdates.sync_status = "synced";
    await admin.from("supplier_qualification").update(safeUpdates).eq("id", qual.id);
  }

  await admin.from("sync_log").insert({
    direction: "inbound", source_app: "erp",
    entity_type: "supplier_qualification", entity_id: qual.id, global_id, action,
    request_payload: parsed, success: true, http_status: 200,
    response_payload: { conflicts },
    idempotency_key: idempotencyKey, remote_ip: remoteIp, duration_ms: Date.now() - t0,
  });

  return NextResponse.json({ ok: true, quality_id: qual.id, fields_updated: Object.keys(safeUpdates), conflicts });
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
