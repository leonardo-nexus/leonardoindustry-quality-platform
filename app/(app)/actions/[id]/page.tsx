import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createServerClient } from "@/lib/supabase/server";
import { VerifyForm } from "./verify-form";
import { AuditTrailPanel } from "@/components/audit/audit-trail-panel";

export default async function ActionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerClient();
  const { data: action } = await supabase
    .from("corrective_action")
    .select("*, company:company_id(name), responsible:responsible_id(first_name,last_name), nc:non_conformity_id(id, title, code)")
    .eq("id", id)
    .maybeSingle();
  if (!action) notFound();

  const { data: people } = await supabase.from("person").select("id, first_name, last_name").order("last_name");

  return (
    <>
      <PageHeader
        title={action.title}
        description={(action as any).nc ? `NC ${(action as any).nc.code ?? ""} — ${(action as any).nc.title}` : "Azione indipendente"}
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Dettagli azione</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div><span className="font-medium">Causa: </span>{action.root_cause ?? "—"}</div>
              <div><span className="font-medium">Piano: </span>{action.action_plan}</div>
              <div><span className="font-medium">Responsabile: </span>{(action as any).responsible?.first_name} {(action as any).responsible?.last_name}</div>
              <div><span className="font-medium">Scadenza: </span>{format(new Date(action.due_date), "dd/MM/yyyy")}</div>
              <div><span className="font-medium">Stato: </span><Badge variant="outline">{action.status}</Badge></div>
              {action.effectiveness_check && (
                <div className="border-t pt-3 mt-3">
                  <div className="font-medium">Verifica efficacia</div>
                  <div>{action.effectiveness_check}</div>
                  <div className="text-xs text-muted-foreground">
                    Verificata il {action.effectiveness_verified_at}
                  </div>
                </div>
              )}
              {(action as any).nc && (
                <Link className="text-sm underline" href={`/non-conformities/${(action as any).nc.id}`}>
                  Vai alla NC collegata →
                </Link>
              )}
            </CardContent>
          </Card>
        </div>
        {!["efficace","non_efficace"].includes(action.status) && (
          <Card>
            <CardHeader>
              <CardTitle>Verifica efficacia</CardTitle>
            </CardHeader>
            <CardContent>
              <VerifyForm actionId={id} people={people ?? []} />
            </CardContent>
          </Card>
        )}
      </div>
      <div className="mt-6">
        <AuditTrailPanel entityType="corrective_action" entityId={id} showRevisions={false} />
      </div>
    </>
  );
}
