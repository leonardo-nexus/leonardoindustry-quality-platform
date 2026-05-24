import { NextRequest, NextResponse } from "next/server";
import { runQualityEscalationsAction } from "@/app/(app)/quality-sentinel/reports/actions";
import { emitCalendarReminders } from "@/lib/quality/calendar-reminders";
import { snapshotDailyScores } from "@/lib/quality/snapshot";

/**
 * Endpoint cron Vercel: esegue il pass escalation T-7/T-3/T-1/T/T+1/T+3/T+7.
 *
 * Configurazione Vercel `vercel.json`:
 * {
 *   "crons": [
 *     { "path": "/api/cron/quality-escalations", "schedule": "0 6 * * *" }
 *   ]
 * }
 *
 * Protezione: header `Authorization: Bearer ${CRON_SECRET}` o `x-vercel-cron: 1`.
 * Vercel cron invia automaticamente l'header `Authorization` con `Bearer ${process.env.CRON_SECRET}`.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronHeader = req.headers.get("x-vercel-cron");
  const expected = process.env.CRON_SECRET;

  // Vercel cron-job interno passa x-vercel-cron: 1 anche senza header auth
  const isVercelCron = cronHeader === "1";
  const hasValidSecret = expected && authHeader === `Bearer ${expected}`;

  if (!isVercelCron && !hasValidSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const r = await runQualityEscalationsAction();
    const cal = await emitCalendarReminders();
    const snap = await snapshotDailyScores();
    return NextResponse.json({ ...r, calendar: cal, snapshot: snap, ranAt: new Date().toISOString() });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message, ranAt: new Date().toISOString() },
      { status: 500 },
    );
  }
}

// Forza esecuzione runtime Node.js (Service Role key non disponibile in Edge)
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
