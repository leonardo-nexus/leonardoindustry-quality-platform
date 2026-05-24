"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Play, Loader2, CheckCircle2, XCircle, ChevronDown, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { runErpTestSuiteAction, type TestResult } from "./actions";

export function TestRunner({ globalId }: { globalId: string }) {
  const [pending, startTransition] = useTransition();
  const [results, setResults] = useState<TestResult[] | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  function run() {
    setResults(null);
    startTransition(async () => {
      const r = await runErpTestSuiteAction(globalId);
      setResults(r.tests);
      const pass = r.tests.filter((t) => t.ok).length;
      if (pass === r.tests.length) toast.success(`Tutti i ${pass} test passati`);
      else toast.warning(`${pass}/${r.tests.length} test passati`);
    });
  }

  function toggle(i: number) {
    const n = new Set(expanded);
    if (n.has(i)) n.delete(i); else n.add(i);
    setExpanded(n);
  }

  return (
    <Card className="leo-card">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-base">Esegui suite test (5 scenari)</CardTitle>
        <Button onClick={run} disabled={pending} size="sm" className="mobile-action">
          {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
          Esegui suite
        </Button>
      </CardHeader>
      <CardContent>
        {!results && !pending && (
          <p className="text-sm text-leo-muted">Click "Esegui suite" per lanciare i 5 test contro gli endpoint locali.</p>
        )}
        {pending && <p className="text-sm text-leo-muted"><Loader2 className="inline mr-1 h-3 w-3 animate-spin" /> Esecuzione test in corso...</p>}
        {results && (
          <div className="space-y-2">
            {results.map((t, i) => (
              <div key={i} className={`rounded-md border p-3 ${t.ok ? "border-status-green/40 bg-status-green/5" : "border-status-red/40 bg-status-red/5"}`}>
                <button onClick={() => toggle(i)} className="w-full text-left flex items-start gap-2">
                  {t.ok ? <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-status-green" /> : <XCircle className="h-4 w-4 shrink-0 mt-0.5 text-status-red" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{t.name}</span>
                      <Badge variant={t.ok ? "green" : "red"} className="text-[10px]">{t.ok ? "PASS" : "FAIL"}</Badge>
                    </div>
                    <p className="text-xs mt-1">{t.details}</p>
                  </div>
                  {(t.response || t.payload) && (expanded.has(i) ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />)}
                </button>
                {expanded.has(i) && (t.response || t.payload) && (
                  <pre className="mt-2 max-h-60 overflow-auto rounded bg-leo-card/40 p-2 text-[10px]">
                    {JSON.stringify(t.response ?? t.payload, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
