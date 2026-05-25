import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

/**
 * GET /api/integrations/erp/status
 * Endpoint pubblico (no auth) per healthcheck integrazione.
 */
export async function GET(_req: NextRequest) {
  const admin = createServiceRoleClient();
  const [
    { count: pending },
    { count: failed },
    { count: conflicts },
    { data: lastInbound },
    { data: lastOutbound },
  ] = await Promise.all([
    admin.from("sync_outbox").select("id", { count: "exact", head: true }).eq("status", "pending"),
    admin.from("sync_outbox").select("id", { count: "exact", head: true }).eq("status", "failed"),
    admin.from("sync_conflict").select("id", { count: "exact", head: true }).eq("resolved", false),
    admin.from("sync_log").select("created_at").eq("direction", "inbound").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    admin.from("sync_log").select("created_at").eq("direction", "outbound").order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);

  // Diagnostica DB target (solo project ref, niente segreti)
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const dbRefMatch = url.match(/https?:\/\/([a-z0-9]+)\.supabase\.co/);
  const dbRef = dbRefMatch ? dbRefMatch[1] : "(unknown)";

  return NextResponse.json({
    status: "ok",
    outbox: { pending: pending ?? 0, failed: failed ?? 0 },
    unresolved_conflicts: conflicts ?? 0,
    last_inbound_at: lastInbound?.created_at ?? null,
    last_outbound_at: lastOutbound?.created_at ?? null,
    integration_secret_configured: !!process.env.QUALITY_INTEGRATION_SECRET,
    erp_url_configured: !!process.env.ERP_INTEGRATION_URL,
    db_ref: dbRef,
    deploy_url: process.env.VERCEL_URL ?? "(local)",
    deploy_commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "(unknown)",
  });
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
