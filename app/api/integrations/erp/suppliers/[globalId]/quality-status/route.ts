import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { verifyErpRequest } from "@/lib/integration/hmac";

/**
 * Endpoint pubblico ERP: ritorna stato qualifica fornitore.
 * GET /api/integrations/erp/suppliers/[globalId]/quality-status
 *
 * Headers richiesti (per protezione):
 * - X-Timestamp / X-Signature / X-Idempotency-Key (GET firma stringa vuota)
 *
 * ERP usa questo endpoint PRIMA di accettare ordine:
 * - se blocked_for_orders=true → rifiuta ordine
 * - mostra score + missing documents + block reasons
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ globalId: string }> }) {
  const { globalId } = await params;
  const t0 = Date.now();
  const timestamp = req.headers.get("x-timestamp");
  const signature = req.headers.get("x-signature");
  const idempotencyKey = req.headers.get("x-idempotency-key") ?? `query-${globalId}-${Date.now()}`;

  const verify = verifyErpRequest({
    timestamp, signature, idempotencyKey, body: "",
    secret: process.env.QUALITY_INTEGRATION_SECRET,
  });

  const admin = createServiceRoleClient();
  if (!verify.ok) {
    await admin.from("sync_log").insert({
      direction: "inbound", source_app: "erp",
      action: "supplier.quality_status_request",
      global_id: globalId,
      success: false, http_status: 401, error_message: verify.error,
      duration_ms: Date.now() - t0,
    });
    return NextResponse.json({ error: verify.error }, { status: 401 });
  }

  const { data: qual } = await admin
    .from("supplier_qualification")
    .select("global_id, qualification_status, score, blocked_for_orders, block_reasons, valid_until, last_synced_at")
    .eq("global_id", globalId)
    .maybeSingle();

  if (!qual) {
    return NextResponse.json({
      error: "Fornitore non trovato in Quality",
      blocked_for_orders: true,
      block_reasons: ["Fornitore non qualificato in Quality"],
    }, { status: 404 });
  }

  // Documenti mancanti
  const { data: docs } = await admin
    .from("qualification_document")
    .select("document_type, mandatory, uploaded, expiry_date")
    .eq("qualification_id", (await admin.from("supplier_qualification").select("id").eq("global_id", globalId).maybeSingle()).data?.id);

  const missing = (docs ?? [])
    .filter((d: any) => d.mandatory && (!d.uploaded || (d.expiry_date && new Date(d.expiry_date) < new Date())))
    .map((d: any) => d.document_type);

  await admin.from("sync_log").insert({
    direction: "inbound", source_app: "erp",
    entity_type: "supplier_qualification", global_id: globalId,
    action: "supplier.quality_status_request",
    success: true, http_status: 200,
    duration_ms: Date.now() - t0,
  });

  return NextResponse.json({
    supplier_global_id: qual.global_id,
    qualification_status: qual.qualification_status,
    score: qual.score,
    blocked_for_orders: qual.blocked_for_orders,
    block_reasons: qual.block_reasons ?? [],
    valid_until: qual.valid_until,
    missing_documents: missing,
    last_updated_at: qual.last_synced_at ?? new Date().toISOString(),
  });
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
