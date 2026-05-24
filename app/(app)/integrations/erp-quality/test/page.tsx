import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createServerClient } from "@/lib/supabase/server";
import { TestRunner } from "./test-runner";

export default async function ErpTestSuitePage() {
  const supabase = await createServerClient();
  const { data: demo } = await supabase
    .from("supplier_qualification")
    .select("id, global_id, supplier_name, score, blocked_for_orders")
    .eq("erp_supplier_id", "SUP-DEMO-ERP-QUALITY-001")
    .maybeSingle();

  const envStatus = {
    QUALITY_INTEGRATION_SECRET: !!process.env.QUALITY_INTEGRATION_SECRET,
    ERP_INTEGRATION_URL: !!process.env.ERP_INTEGRATION_URL,
    ERP_INTEGRATION_SECRET: !!process.env.ERP_INTEGRATION_SECRET,
    ERP_RETURN_URL: !!process.env.ERP_RETURN_URL,
    CRON_SECRET: !!process.env.CRON_SECRET,
  };

  return (
    <>
      <PageHeader
        title="ERP ↔ Quality · Test end-to-end"
        description="Esegue tutti i 5 test PROMPT_05 e mostra risultati live"
        actions={<Button asChild variant="outline"><Link href="/integrations/erp-quality">← Console</Link></Button>}
      />

      {/* Env status */}
      <Card className="leo-card mb-4">
        <CardHeader>
          <CardTitle className="text-base">Variabili ambiente configurate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-5 text-xs">
            {Object.entries(envStatus).map(([k, ok]) => (
              <div key={k} className={`rounded-md border p-2 ${ok ? "border-status-green/40 bg-status-green/5" : "border-status-red/40 bg-status-red/5"}`}>
                <code className="text-[10px]">{k}</code>
                <div className="mt-1"><Badge variant={ok ? "green" : "red"} className="text-[10px]">{ok ? "✓ configurato" : "❌ mancante"}</Badge></div>
              </div>
            ))}
          </div>
          {!envStatus.QUALITY_INTEGRATION_SECRET && (
            <p className="mt-3 text-xs text-status-red">
              ⚠ Senza <code>QUALITY_INTEGRATION_SECRET</code> i test 1, 2, 3 falliranno. Configura su Vercel Project Settings → Environment Variables.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Demo fornitore */}
      <Card className="leo-card mb-4">
        <CardHeader>
          <CardTitle className="text-base">Fornitore demo per test</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {demo ? (
            <div className="space-y-1">
              <div>Nome: <strong>{demo.supplier_name}</strong></div>
              <div>ERP ID: <code>SUP-DEMO-ERP-QUALITY-001</code></div>
              <div>Global ID: <code className="text-xs">{demo.global_id}</code></div>
              <div>Score: <Badge variant={demo.score >= 60 ? "green" : "red"}>{demo.score}/100</Badge> · Bloccato ordini: <Badge variant={demo.blocked_for_orders ? "red" : "green"}>{demo.blocked_for_orders ? "Sì" : "No"}</Badge></div>
              <div className="mt-2">
                <Button asChild size="sm" variant="outline">
                  <Link href={`/suppliers/qualification/${demo.id}`}>Apri scheda qualifica →</Link>
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-status-red">Demo non trovata. Esegui prima il seed SUP-DEMO-ERP-QUALITY-001.</p>
          )}
        </CardContent>
      </Card>

      {/* Test runner */}
      {demo && <TestRunner globalId={demo.global_id} />}

      {/* Documentazione */}
      <Card className="leo-card mt-6 border-leo-border/50">
        <CardHeader><CardTitle className="text-base">Cosa fa ogni test</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-xs">
          <TestDoc n={1} title="Quality-status endpoint" desc="GET /api/integrations/erp/suppliers/[globalId]/quality-status con HMAC valido. Ritorna score, status, blocked_for_orders, block_reasons, missing_documents." />
          <TestDoc n={2} title="Webhook ERP simulato" desc="POST /api/integrations/erp/webhook con action=supplier.updated e cambio email/phone. Anagrafica aggiornata in Quality, qualifica intatta." />
          <TestDoc n={3} title="Conflitto su campo protetto" desc="POST webhook che tenta di sovrascrivere score/qualification_status. Quality NON sovrascrive: registra sync_conflict." />
          <TestDoc n={4} title="Healthcheck integrazione" desc="GET /api/integrations/erp/status pubblico. Mostra outbox pending/failed + conflicts + config secrets." />
          <TestDoc n={5} title="Blocco ordini score < 60" desc="Verifica diretta DB: la demo ha score 58, blocked_for_orders=true, 4 block_reasons. ERP che chiama Test 1 riceverebbe blocked=true." />
        </CardContent>
      </Card>
    </>
  );
}

function TestDoc({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <div className="rounded-md border border-leo-border p-2">
      <div className="font-semibold"><Badge variant="outline" className="text-[10px] mr-2">Test {n}</Badge>{title}</div>
      <p className="text-leo-muted mt-1">{desc}</p>
    </div>
  );
}
