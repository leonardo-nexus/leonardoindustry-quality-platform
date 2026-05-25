import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

/**
 * GET /api/integrations/erp/debug-supplier/[globalId]
 * DIAGNOSTIC TEMPORANEO - identifica disallineamento tra DB diretto e quality-status endpoint.
 *
 * Mostra esattamente cosa vede il client Supabase usato dal runtime Vercel.
 * Usa la STESSA createServiceRoleClient() usata dal quality-status endpoint.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ globalId: string }> }) {
  const { globalId } = await params;

  // Stesso client del quality-status route
  const admin = createServiceRoleClient();

  // Env diagnostic
  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const dbRefMatch = supaUrl.match(/https?:\/\/([a-z0-9]+)\.supabase\.co/);
  const dbRef = dbRefMatch ? dbRefMatch[1] : "(unknown)";
  const serviceKeyTail = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").slice(-8);

  // 1) Conta tutti i record con quel global_id
  const { count: totalCount, error: countErr } = await admin
    .from("supplier_qualification")
    .select("id", { count: "exact", head: true })
    .eq("global_id", globalId);

  // 2) Lista TUTTI i record (max 10), ordinati per updated_at desc
  const { data: rows, error: rowsErr } = await admin
    .from("supplier_qualification")
    .select("id, global_id, erp_supplier_id, legal_name, score, qualification_status, blocked_for_orders, block_reasons, last_synced_at, created_at, updated_at")
    .eq("global_id", globalId)
    .order("updated_at", { ascending: false, nullsFirst: false })
    .limit(10);

  // 3) Esegue la STESSA query del quality-status (maybeSingle)
  const { data: maybeSingleResult, error: maybeSingleErr } = await admin
    .from("supplier_qualification")
    .select("id, global_id, qualification_status, score, blocked_for_orders, block_reasons, valid_until, last_synced_at, updated_at")
    .eq("global_id", globalId)
    .maybeSingle();

  // 4) Schema table (column names)
  const { data: schemaInfo } = await admin
    .rpc("pg_typeof_first" as any, {})
    .catch(() => ({ data: null }));

  return NextResponse.json({
    diagnostic: {
      timestamp_server: new Date().toISOString(),
      deploy_commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "(unknown)",
      deploy_url: process.env.VERCEL_URL ?? "(local)",
      runtime: process.env.NEXT_RUNTIME ?? "nodejs",
    },
    supabase_target: {
      url: supaUrl.replace(/^https?:\/\//, "").replace(/\.supabase\.co.*$/, ".supabase.co"),
      project_ref_extracted: dbRef,
      service_role_key_tail: `***${serviceKeyTail}`,
      service_role_key_set: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      project_ref_env: process.env.SUPABASE_PROJECT_REF ?? "(not set)",
    },
    query_global_id: globalId,
    counts: {
      total_records_for_global_id: totalCount ?? 0,
      count_error: countErr?.message ?? null,
    },
    all_records_ordered: rows ?? [],
    all_records_error: rowsErr?.message ?? null,
    maybe_single_result: maybeSingleResult,
    maybe_single_error: maybeSingleErr?.message ?? null,
    notes: [
      "Se total_records_for_global_id > 1 → duplicati: maybeSingle può ritornare il vecchio",
      "Se total_records_for_global_id = 1 ma maybeSingle ha valori diversi da all_records_ordered[0] → bug Supabase client",
      "Se project_ref_extracted differente da rdwaymddygcsfbwbqwtv → env Vercel punta a DB sbagliato",
    ],
  });
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
