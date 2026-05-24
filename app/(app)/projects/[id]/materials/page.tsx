import { notFound } from "next/navigation";
import Link from "next/link";
import { Package, Lock, Plus, ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createServerClient } from "@/lib/supabase/server";
import { LossPreventionBanner } from "@/components/quality/loss-prevention-banner";
import { canUseMaterial } from "@/lib/quality/loss-prevention";
import { VerifyMaterialButton, RecheckButton, NewMaterialLotForm } from "./material-actions-ui";

const STATUS_VARIANT: Record<string, "yellow" | "orange" | "green" | "red" | "gray"> = {
  in_attesa_verifica: "yellow", verificato: "green", bloccato: "red", utilizzato: "gray", scartato: "gray",
  da_controllare: "yellow", approvato: "green", rifiutato: "red",
};

export default async function ProjectMaterialsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerClient();

  const { data: project } = await supabase
    .from("project").select("id, code, name, company_id, company:company_id(name)")
    .eq("id", id).maybeSingle();
  if (!project) notFound();

  const { data: lots } = await supabase
    .from("material_lot")
    .select("*, sheet:technical_sheet_id(code, title, status), live_check:live_check_by(first_name, last_name)")
    .eq("project_id", id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  const { data: sheets } = await supabase
    .from("technical_sheet")
    .select("id, code, title, status")
    .eq("project_id", id)
    .is("deleted_at", null)
    .order("title");

  // Calcola gate per ciascun lotto (e mostra blockers inline)
  const gates = await Promise.all(
    (lots ?? []).map(async (l: any) => ({ id: l.id, gate: await canUseMaterial(l.id) }))
  );
  const gateMap: Record<string, any> = {};
  gates.forEach(g => { gateMap[g.id] = g.gate; });

  const blockedCount = (lots ?? []).filter((l: any) => !gateMap[l.id]?.is_usable).length;

  // Banner di pagina: somma tutti i blockers dei lotti
  const allBlockers: any[] = [];
  for (const l of lots ?? []) {
    const gate = gateMap[l.id];
    if (gate && !gate.is_usable) {
      for (const b of gate.blockers) {
        allBlockers.push({
          label: `Lotto ${l.lot_code}: ${b.label}`,
          detail: b.detail,
          action_url: `/projects/${id}/materials#lot-${l.id}`,
          severity: b.severity,
        });
      }
    }
  }

  return (
    <>
      <PageHeader
        title={`Materiali — ${project.code}`}
        description={`${(project as any).company?.name} · ${project.name} · ${blockedCount} lotti bloccati su ${lots?.length ?? 0}`}
        actions={
          <div className="flex gap-2">
            <Button asChild variant="outline"><Link href={`/projects/${id}/contracts`}>Contratti</Link></Button>
            <Button asChild variant="outline"><Link href={`/projects/${id}/technical-sheets`}>Schede tecniche</Link></Button>
            <Button asChild variant="outline"><Link href={`/projects/${id}`}>← Commessa</Link></Button>
          </div>
        }
      />

      {allBlockers.length > 0 && (
        <LossPreventionBanner items={allBlockers.slice(0, 10)} title="MATERIALI NON UTILIZZABILI" />
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-3">
          {(lots ?? []).length === 0 ? (
            <Card className="leo-card">
              <CardContent className="p-6 text-center">
                <Package className="mx-auto h-8 w-8 text-leo-muted mb-2" />
                <p className="text-sm">Nessun lotto materiale registrato per questa commessa</p>
              </CardContent>
            </Card>
          ) : (
            (lots ?? []).map((l: any) => {
              const gate = gateMap[l.id];
              const isBlocked = gate && !gate.is_usable;
              return (
                <Card key={l.id} id={`lot-${l.id}`} className={`leo-card ${isBlocked ? "border-status-red/40" : ""}`}>
                  <CardContent className="p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          {isBlocked && <Lock className="h-4 w-4 text-status-red" />}
                          <span className="font-mono text-xs text-brand-cyan">{l.lot_code}</span>
                          <Badge variant={STATUS_VARIANT[l.status] ?? "outline"}>{l.status.replace(/_/g, " ")}</Badge>
                          {l.sheet && <Badge variant="outline" className="text-[10px]">scheda {l.sheet.code} ({l.sheet.status})</Badge>}
                        </div>
                        <div className="mt-1 font-medium">{l.material_description ?? l.material_grade}</div>
                        <div className="mt-1 text-xs text-leo-muted">
                          Quantità: {l.quantity ?? "—"} {l.unit ?? ""} · fornitore {l.supplier_name ?? "—"} · heat {l.heat_number ?? "—"}
                        </div>
                        {l.block_reason && (
                          <div className="mt-2 rounded-md border border-status-red/30 bg-status-red/5 p-2 text-xs text-status-red">
                            <ShieldAlert className="inline h-3 w-3 mr-1" /> Motivo blocco: {l.block_reason}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-1 items-end">
                        <VerifyMaterialButton lotId={l.id} projectId={id} disabled={isBlocked} />
                        <RecheckButton lotId={l.id} projectId={id} />
                      </div>
                    </div>
                    {isBlocked && gate?.blockers?.length > 0 && (
                      <div className="mt-3 border-t border-status-red/20 pt-2">
                        <p className="text-[10px] uppercase text-status-red font-semibold">Cosa manca per usarlo:</p>
                        <ul className="mt-1 space-y-0.5">
                          {gate.blockers.map((b: any, i: number) => (
                            <li key={i} className="text-xs text-leo-muted">
                              <span className="text-status-red mr-1">•</span> {b.label} <span className="italic">— {b.detail}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        <div className="space-y-4">
          <Card className="leo-card">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Plus className="h-4 w-4" /> Registra nuovo lotto</CardTitle>
            </CardHeader>
            <CardContent>
              <NewMaterialLotForm projectId={id} companyId={project.company_id} sheets={sheets ?? []} />
            </CardContent>
          </Card>

          <Card className="leo-card border-status-orange/40">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-status-orange" /> Come funziona il gate</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-leo-muted space-y-1">
              <p>Un lotto è <strong className="text-status-green">utilizzabile</strong> solo se ha:</p>
              <ul className="ml-3 list-disc space-y-0.5">
                <li>Codice lotto/colata</li>
                <li>Certificato 3.1 / equivalente</li>
                <li>Scheda tecnica collegata e <strong>approvata</strong></li>
                <li>Foto live materiale/etichetta (verifica visiva cantiere)</li>
              </ul>
              <p className="mt-2">Se manca anche uno solo, il lotto è <strong className="text-status-red">bloccato</strong> automaticamente.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
