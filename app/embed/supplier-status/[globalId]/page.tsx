import { createServiceRoleClient } from "@/lib/supabase/server";
import { computeHmac } from "@/lib/integration/hmac";

/**
 * Widget embeddable in iframe ERP.
 *
 * Uso ERP:
 *   <iframe src="https://quality.../embed/supplier-status/[globalId]?ts=...&sig=..." />
 *
 * Firma: HMAC-SHA256 di `${globalId}.${timestamp}` con QUALITY_INTEGRATION_SECRET
 * Timestamp valido ±5min per prevenire replay.
 *
 * Usa app/embed/layout.tsx — niente sidebar/topbar.
 */
export default async function SupplierStatusEmbed({ params, searchParams }: {
  params: Promise<{ globalId: string }>;
  searchParams: Promise<{ ts?: string; sig?: string }>;
}) {
  const { globalId } = await params;
  const sp = await searchParams;

  const secret = process.env.QUALITY_INTEGRATION_SECRET;
  let authError: string | null = null;
  if (!secret) authError = "QUALITY_INTEGRATION_SECRET non configurato";
  else if (!sp.ts || !sp.sig) authError = "Mancano parametri ts/sig nell'URL";
  else {
    const ageSec = Math.abs(Date.now() / 1000 - parseInt(sp.ts, 10));
    if (ageSec > 300) authError = `URL scaduta (${Math.round(ageSec)}s > 300s)`;
    else {
      const expected = computeHmac(`${globalId}.${sp.ts}`, secret);
      if (expected !== sp.sig) authError = "Firma HMAC non valida";
    }
  }

  if (authError) {
    return (
      <div style={{ color: "#dc2626", background: "#fef2f2", padding: "12px", borderRadius: "8px", border: "1px solid #dc2626" }}>
        <strong>⚠ Errore widget Quality</strong>
        <p style={{ fontSize: "12px", marginTop: "8px" }}>{authError}</p>
      </div>
    );
  }

  const admin = createServiceRoleClient();
  const { data: q } = await admin
    .from("supplier_qualification")
    .select("*")
    .eq("global_id", globalId)
    .maybeSingle();

  if (!q) {
    return (
      <div style={{ color: "#dc2626", background: "#fef2f2", padding: "12px", borderRadius: "8px", border: "1px solid #dc2626" }}>
        <strong>Fornitore non trovato in Quality</strong>
        <p style={{ fontSize: "12px", marginTop: "8px" }}>global_id: <code>{globalId}</code></p>
        <p style={{ fontSize: "12px", marginTop: "8px", fontWeight: 600 }}>⛔ ERP deve assumere blocked_for_orders=true</p>
      </div>
    );
  }

  const { data: docs } = await admin
    .from("qualification_document")
    .select("document_type, mandatory, uploaded, expiry_date")
    .eq("qualification_id", q.id);
  const missing = (docs ?? [])
    .filter((d: any) => d.mandatory && (!d.uploaded || (d.expiry_date && new Date(d.expiry_date) < new Date())))
    .map((d: any) => d.document_type);

  const score = q.score ?? 0;
  const scoreColor = score >= 90 ? "#10b981" : score >= 75 ? "#3b82f6" : score >= 60 ? "#eab308" : score >= 40 ? "#f97316" : "#dc2626";
  const blockBg = q.blocked_for_orders ? "#fef2f2" : "#f0fdf4";
  const blockBorder = q.blocked_for_orders ? "#dc2626" : "#10b981";

  const returnUrl = process.env.ERP_RETURN_URL ?? "";
  const qualityUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/suppliers/qualification/${q.id}?source=erp`;

  return (
    <div style={{ background: blockBg, padding: "8px", borderRadius: "8px" }}>
      <div style={{ border: `2px solid ${blockBorder}`, borderRadius: "8px", padding: "12px", background: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
          <strong style={{ fontSize: "14px" }}>{q.legal_name}</strong>
          <span style={{ fontSize: "11px", color: "#64748b" }}>Quality Control Plant</span>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "12px" }}>
          <div style={{ fontSize: "32px", fontWeight: "bold", color: scoreColor, lineHeight: 1 }}>
            {q.score ?? "—"}<span style={{ fontSize: "16px", color: "#64748b" }}>/100</span>
          </div>
          <div>
            <div style={{ fontSize: "12px", padding: "2px 8px", background: scoreColor, color: "#fff", borderRadius: "4px", display: "inline-block" }}>
              {q.qualification_status.replace(/_/g, " ")}
            </div>
            {q.valid_until && <div style={{ fontSize: "10px", color: "#64748b", marginTop: "4px" }}>Valida fino al {new Date(q.valid_until).toLocaleDateString("it-IT")}</div>}
          </div>
        </div>

        {q.blocked_for_orders && (
          <div style={{ background: "#fee2e2", border: "1px solid #dc2626", borderRadius: "4px", padding: "8px", marginBottom: "8px" }}>
            <strong style={{ color: "#dc2626", fontSize: "12px" }}>⛔ ORDINI BLOCCATI</strong>
            {q.block_reasons && q.block_reasons.length > 0 && (
              <ul style={{ fontSize: "11px", color: "#7f1d1d", margin: "4px 0 0 16px", padding: 0 }}>
                {q.block_reasons.map((r: string, i: number) => <li key={i}>{r}</li>)}
              </ul>
            )}
          </div>
        )}

        {missing.length > 0 && (
          <div style={{ fontSize: "11px", color: "#7c2d12", marginBottom: "8px" }}>
            <strong>Documenti mancanti/scaduti:</strong> {missing.join(" · ")}
          </div>
        )}

        <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
          <a href={qualityUrl} target="_top" style={{ padding: "6px 12px", background: "#06b6d4", color: "#fff", textDecoration: "none", borderRadius: "4px", fontSize: "12px", fontWeight: 500 }}>
            Apri in Quality →
          </a>
          {returnUrl && (
            <a href={returnUrl} style={{ padding: "6px 12px", background: "#64748b", color: "#fff", textDecoration: "none", borderRadius: "4px", fontSize: "12px" }}>
              ← Torna a ERP
            </a>
          )}
        </div>

        <div style={{ marginTop: "12px", paddingTop: "8px", borderTop: "1px solid #e5e7eb", fontSize: "10px", color: "#64748b" }}>
          global_id: <code>{q.global_id}</code> · ultimo sync: {q.last_synced_at ? new Date(q.last_synced_at).toLocaleString("it-IT") : "mai"}
        </div>
      </div>
    </div>
  );
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
