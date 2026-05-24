import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { computeHmac } from "@/lib/integration/hmac";

/**
 * POST /api/integrations/erp/push
 * Trigger manuale/cron del worker outbox: legge sync_outbox pending e li pusha verso ERP.
 *
 * Headers (Vercel cron o admin):
 * - Authorization: Bearer ${CRON_SECRET} oppure x-vercel-cron: 1
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronHeader = req.headers.get("x-vercel-cron");
  const expected = process.env.CRON_SECRET;
  if (cronHeader !== "1" && (!expected || authHeader !== `Bearer ${expected}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createServiceRoleClient();
  const erpUrl = process.env.ERP_INTEGRATION_URL;
  const erpSecret = process.env.ERP_INTEGRATION_SECRET;
  if (!erpUrl || !erpSecret) {
    return NextResponse.json({ ok: true, skipped: true, reason: "ERP_INTEGRATION_URL/SECRET non configurati" });
  }

  // Carica fino a 50 eventi pending
  const { data: events } = await admin
    .from("sync_outbox")
    .select("*")
    .eq("status", "pending")
    .order("created_at")
    .limit(50);

  let sent = 0, failed = 0;
  for (const ev of events ?? []) {
    const t0 = Date.now();
    await admin.from("sync_outbox").update({ status: "sending", attempts: (ev.attempts ?? 0) + 1, last_attempt_at: new Date().toISOString() }).eq("id", ev.id);
    try {
      const body = JSON.stringify({ action: ev.action, global_id: ev.global_id, payload: ev.payload });
      const ts = String(Math.floor(Date.now() / 1000));
      const signature = computeHmac(`${ts}.${body}`, erpSecret);
      const res = await fetch(erpUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-timestamp": ts,
          "x-signature": signature,
          "x-idempotency-key": ev.idempotency_key ?? `out-${ev.id}`,
        },
        body,
      });
      const ok = res.ok;
      await admin.from("sync_outbox").update({ status: ok ? "sent" : "failed", sent_at: ok ? new Date().toISOString() : null, last_error: ok ? null : `HTTP ${res.status}` }).eq("id", ev.id);
      await admin.from("sync_log").insert({
        direction: "outbound", source_app: "quality",
        entity_type: ev.entity_type, entity_id: ev.entity_id, global_id: ev.global_id, action: ev.action,
        request_payload: ev.payload,
        http_status: res.status, success: ok,
        error_message: ok ? null : `HTTP ${res.status}`,
        idempotency_key: ev.idempotency_key,
        duration_ms: Date.now() - t0,
      });
      if (ok) sent++; else failed++;
    } catch (err) {
      await admin.from("sync_outbox").update({ status: "failed", last_error: (err as Error).message }).eq("id", ev.id);
      await admin.from("sync_log").insert({
        direction: "outbound", source_app: "quality",
        entity_type: ev.entity_type, entity_id: ev.entity_id, global_id: ev.global_id, action: ev.action,
        success: false, error_message: (err as Error).message,
        idempotency_key: ev.idempotency_key,
        duration_ms: Date.now() - t0,
      });
      failed++;
    }
  }

  return NextResponse.json({ ok: true, sent, failed, total: (events?.length ?? 0) });
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
