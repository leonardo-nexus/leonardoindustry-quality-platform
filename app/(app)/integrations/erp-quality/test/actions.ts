"use server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";
import { computeHmac } from "@/lib/integration/hmac";

export interface TestResult {
  name: string;
  ok: boolean;
  details: string;
  payload?: any;
  response?: any;
}

/** Esegue tutti i 5 test scenari ERP↔Quality e ritorna i risultati */
export async function runErpTestSuiteAction(globalId?: string): Promise<{ tests: TestResult[] }> {
  await requireSession();
  const admin = createServiceRoleClient();
  const results: TestResult[] = [];

  const targetGlobalId = globalId ?? "demo-erp-quality-d9ffb771";
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace("supabase.co", "") ?? "";
  const localBase = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000";
  const qualitySecret = process.env.QUALITY_INTEGRATION_SECRET;

  // === TEST 1: Quality-status endpoint con HMAC valido ===
  try {
    const ts = String(Math.floor(Date.now() / 1000));
    const sig = qualitySecret ? computeHmac(`${ts}.`, qualitySecret) : "";
    if (!qualitySecret) {
      results.push({
        name: "Test 1: Quality-status endpoint",
        ok: false,
        details: "❌ QUALITY_INTEGRATION_SECRET non configurato in env",
      });
    } else {
      const res = await fetch(`${localBase}/api/integrations/erp/suppliers/${targetGlobalId}/quality-status`, {
        method: "GET",
        headers: {
          "x-timestamp": ts,
          "x-signature": sig,
          "x-idempotency-key": `test-${Date.now()}-status`,
        },
      });
      const body = await res.json();
      results.push({
        name: "Test 1: Quality-status endpoint",
        ok: res.ok,
        details: res.ok ? `✓ HTTP ${res.status} · score=${body.score} · blocked=${body.blocked_for_orders}` : `❌ HTTP ${res.status} · ${body.error}`,
        response: body,
      });
    }
  } catch (e) {
    results.push({ name: "Test 1: Quality-status endpoint", ok: false, details: `❌ Exception: ${(e as Error).message}` });
  }

  // === TEST 2: Webhook ERP simula update email ===
  try {
    if (!qualitySecret) {
      results.push({ name: "Test 2: Webhook ERP simulato", ok: false, details: "❌ QUALITY_INTEGRATION_SECRET non configurato" });
    } else {
      const body = JSON.stringify({
        action: "supplier.updated",
        global_id: targetGlobalId,
        erp_supplier_id: "SUP-DEMO-ERP-QUALITY-001",
        fields: { email: `test-${Date.now()}@erp-sim.it`, phone: "+39 999 888 7777" },
      });
      const ts = String(Math.floor(Date.now() / 1000));
      const sig = computeHmac(`${ts}.${body}`, qualitySecret);
      const res = await fetch(`${localBase}/api/integrations/erp/webhook`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-timestamp": ts,
          "x-signature": sig,
          "x-idempotency-key": `test-${Date.now()}-webhook`,
        },
        body,
      });
      const json = await res.json();
      results.push({
        name: "Test 2: Webhook ERP simulato (cambio email)",
        ok: res.ok,
        details: res.ok ? `✓ HTTP ${res.status} · campi aggiornati: ${(json.fields_updated ?? []).join(",")}` : `❌ HTTP ${res.status} · ${json.error}`,
        response: json,
      });
    }
  } catch (e) {
    results.push({ name: "Test 2: Webhook ERP simulato", ok: false, details: `❌ Exception: ${(e as Error).message}` });
  }

  // === TEST 3: Webhook ERP tenta sovrascrivere campo protetto → deve creare conflict ===
  try {
    if (!qualitySecret) {
      results.push({ name: "Test 3: Conflitto su campo protetto", ok: false, details: "❌ QUALITY_INTEGRATION_SECRET non configurato" });
    } else {
      const body = JSON.stringify({
        action: "supplier.updated",
        global_id: targetGlobalId,
        fields: { score: 99, qualification_status: "qualified_excellent" },
      });
      const ts = String(Math.floor(Date.now() / 1000));
      const sig = computeHmac(`${ts}.${body}`, qualitySecret);
      const res = await fetch(`${localBase}/api/integrations/erp/webhook`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-timestamp": ts,
          "x-signature": sig,
          "x-idempotency-key": `test-${Date.now()}-conflict`,
        },
        body,
      });
      const json = await res.json();
      const hasConflicts = Array.isArray(json.conflicts) && json.conflicts.length > 0;
      results.push({
        name: "Test 3: Conflitto su campo protetto (score/status)",
        ok: hasConflicts,
        details: hasConflicts
          ? `✓ Conflitti rilevati: ${json.conflicts.join(", ")} (NON sovrascritti)`
          : `❌ Nessun conflitto rilevato — ERP avrebbe potuto sovrascrivere campi qualità`,
        response: json,
      });
    }
  } catch (e) {
    results.push({ name: "Test 3: Conflitto su campo protetto", ok: false, details: `❌ Exception: ${(e as Error).message}` });
  }

  // === TEST 4: Status endpoint healthcheck ===
  try {
    const res = await fetch(`${localBase}/api/integrations/erp/status`);
    const json = await res.json();
    results.push({
      name: "Test 4: Healthcheck /api/integrations/erp/status",
      ok: res.ok,
      details: res.ok
        ? `✓ ${json.outbox.pending} pending · ${json.unresolved_conflicts} conflitti · secret=${json.integration_secret_configured} · erp_url=${json.erp_url_configured}`
        : `❌ HTTP ${res.status}`,
      response: json,
    });
  } catch (e) {
    results.push({ name: "Test 4: Healthcheck", ok: false, details: `❌ Exception: ${(e as Error).message}` });
  }

  // === TEST 5: Verifica blocked_for_orders sulla qualifica demo ===
  try {
    const { data: q } = await admin
      .from("supplier_qualification")
      .select("score, qualification_status, blocked_for_orders, block_reasons")
      .eq("global_id", targetGlobalId)
      .maybeSingle();
    if (!q) {
      results.push({ name: "Test 5: Blocco ordini score < 60", ok: false, details: "❌ Qualifica demo non trovata" });
    } else {
      const isBlocked = q.blocked_for_orders === true;
      const lowScore = (q.score ?? 0) < 60;
      const ok = isBlocked && lowScore;
      results.push({
        name: "Test 5: Blocco ordini se score < 60",
        ok,
        details: ok
          ? `✓ Demo bloccata correttamente: score=${q.score} blocked=${q.blocked_for_orders} · ${(q.block_reasons ?? []).length} reasons`
          : `❌ Stato inconsistente: score=${q.score} blocked=${q.blocked_for_orders}`,
        response: q,
      });
    }
  } catch (e) {
    results.push({ name: "Test 5: Blocco ordini", ok: false, details: `❌ Exception: ${(e as Error).message}` });
  }

  return { tests: results };
}

/** Push manuale di un evento outbox specifico via fetch interno */
export async function pushOutboxEventAction(outboxId: string): Promise<TestResult> {
  await requireSession();
  const admin = createServiceRoleClient();
  const cronSecret = process.env.CRON_SECRET;
  const localBase = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000";

  // Per push manuale singolo evento, reset status pending → re-push
  await admin.from("sync_outbox").update({ status: "pending", attempts: 0 }).eq("id", outboxId);

  try {
    const res = await fetch(`${localBase}/api/integrations/erp/push`, {
      method: "POST",
      headers: cronSecret ? { authorization: `Bearer ${cronSecret}` } : { "x-vercel-cron": "1" },
    });
    const json = await res.json();
    return {
      name: "Push outbox manuale",
      ok: res.ok,
      details: res.ok
        ? `✓ Sent ${json.sent} · Failed ${json.failed} su ${json.total} totali`
        : `❌ HTTP ${res.status} · ${json.error ?? "—"}`,
      response: json,
    };
  } catch (e) {
    return { name: "Push outbox manuale", ok: false, details: `❌ Exception: ${(e as Error).message}` };
  }
}
