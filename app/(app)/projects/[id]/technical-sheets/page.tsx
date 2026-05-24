import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { FileText, AlertTriangle, Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createServerClient } from "@/lib/supabase/server";
import { ProjectStartupBanner } from "@/components/quality/loss-prevention-banner";
import { canStartProject } from "@/lib/quality/loss-prevention";
import { ApproveSheetButton, NewSheetForm } from "./sheet-actions-ui";

const STATUS_VARIANT: Record<string, "yellow" | "orange" | "green" | "red" | "gray"> = {
  da_approvare: "orange", approvata: "green", obsoleta: "gray", contestata: "red", archiviata: "gray",
};

export default async function ProjectTechnicalSheetsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerClient();

  const { data: project } = await supabase
    .from("project").select("id, code, name, company_id, company:company_id(name)")
    .eq("id", id).maybeSingle();
  if (!project) notFound();
  await canStartProject(id);

  const { data: sheets } = await supabase
    .from("technical_sheet")
    .select("*, approved:approved_by(first_name,last_name)")
    .eq("project_id", id)
    .is("deleted_at", null)
    .order("status").order("title");

  const pending = (sheets ?? []).filter((s: any) => s.status === "da_approvare").length;
  const approved = (sheets ?? []).filter((s: any) => s.status === "approvata").length;

  return (
    <>
      <PageHeader
        title={`Schede tecniche — ${project.code}`}
        description={`${(project as any).company?.name} · ${project.name} · ${pending} da approvare · ${approved} approvate`}
        actions={
          <div className="flex gap-2">
            <Button asChild variant="outline"><Link href={`/projects/${id}/contracts`}>Contratti</Link></Button>
            <Button asChild variant="outline"><Link href={`/projects/${id}/materials`}>Materiali</Link></Button>
            <Button asChild variant="outline"><Link href={`/projects/${id}`}>← Commessa</Link></Button>
          </div>
        }
      />

      <ProjectStartupBanner projectId={id} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-3">
          {(sheets ?? []).length === 0 ? (
            <Card className="leo-card border-status-orange/30">
              <CardContent className="p-6 text-center">
                <FileText className="mx-auto h-8 w-8 text-status-orange mb-2" />
                <p className="text-sm text-status-orange font-medium">Nessuna scheda tecnica caricata</p>
                <p className="text-xs text-leo-muted mt-1">Almeno una scheda materiale è richiesta per sbloccare l'avvio commessa</p>
              </CardContent>
            </Card>
          ) : (
            (sheets ?? []).map((s: any) => (
              <Card key={s.id} className="leo-card">
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-brand-cyan">{s.code}</span>
                        <Badge variant="outline" className="text-[10px]">rev. {s.revision}</Badge>
                        <Badge variant={STATUS_VARIANT[s.status] ?? "outline"}>{s.status.replace(/_/g, " ")}</Badge>
                      </div>
                      <div className="mt-1 font-medium">{s.title}</div>
                      <div className="mt-1 text-xs text-leo-muted">
                        Tipo: {s.material_type ?? "—"} · Fornitore: {s.supplier_name ?? "—"}
                        {s.approved_at && <> · Approvata da {s.approved?.first_name} {s.approved?.last_name} il {format(new Date(s.approved_at), "dd/MM/yyyy")}</>}
                      </div>
                    </div>
                    {s.status === "da_approvare" && (
                      <ApproveSheetButton sheetId={s.id} projectId={id} />
                    )}
                  </div>
                  {s.status === "da_approvare" && (
                    <div className="mt-2 rounded-md border border-status-orange/30 bg-status-orange/5 p-2 text-xs text-status-orange">
                      <AlertTriangle className="inline h-3 w-3 mr-1" /> Senza approvazione formale, materiali collegati a questa scheda NON sono utilizzabili
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <div className="space-y-4">
          <Card className="leo-card">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Plus className="h-4 w-4" /> Nuova scheda tecnica</CardTitle>
            </CardHeader>
            <CardContent>
              <NewSheetForm projectId={id} companyId={project.company_id} />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
