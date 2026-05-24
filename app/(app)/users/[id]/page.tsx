import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { Shield, Users as UsersIcon } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createServerClient } from "@/lib/supabase/server";
import { AuditTrailPanel } from "@/components/audit/audit-trail-panel";
import { UserEditPanel } from "./user-edit-panel";

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerClient();

  const { data: person } = await supabase
    .from("person")
    .select("*, company:company_id(id, name), role:role_id(code, name)")
    .eq("id", id)
    .maybeSingle();
  if (!person) notFound();

  const [{ data: companies }, { data: roles }, { data: assignments }, { data: teams }] = await Promise.all([
    supabase.from("company").select("id, name").eq("active", true).order("name"),
    supabase.from("role").select("code, name, role_level").eq("active", true).order("role_level", { ascending: false }),
    supabase.from("user_assignment").select("id, entity_type, assignment_type, priority, status, due_date, created_at").eq("assigned_to_person_id", id).order("created_at", { ascending: false }).limit(20),
    supabase.from("team_member").select("team_role, joined_at, active, team:team_id(id, code, name, team_type)").eq("person_id", id),
  ]);

  return (
    <>
      <PageHeader
        title={`${person.first_name} ${person.last_name}`}
        description={`${person.email ?? "—"} · ${(person as any).company?.name ?? "—"}`}
        actions={<Button asChild variant="outline"><Link href="/users">← Utenti</Link></Button>}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Card className="leo-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="h-4 w-4" /> Anagrafica + ruolo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <UserEditPanel person={person} companies={companies ?? []} roles={roles ?? []} />
            </CardContent>
          </Card>

          <Card className="leo-card">
            <CardHeader>
              <CardTitle className="text-base">Assegnazioni recenti</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {(assignments?.length ?? 0) === 0 && <p className="text-xs text-leo-muted">Nessuna assegnazione</p>}
              {(assignments ?? []).map((a: any) => (
                <div key={a.id} className="flex items-center justify-between rounded-md border border-leo-border bg-leo-card/40 px-3 py-2 text-xs">
                  <div>
                    <Badge variant="outline" className="text-[10px] mr-2">{a.assignment_type}</Badge>
                    <span>{a.entity_type}</span>
                    {a.due_date && <span className="text-leo-muted ml-2">· scad. {format(new Date(a.due_date), "dd/MM")}</span>}
                  </div>
                  <Badge variant={a.status === "completata" ? "green" : a.status === "scaduta" ? "red" : "yellow"}>{a.status}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="leo-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><UsersIcon className="h-4 w-4" /> Team</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {(teams?.length ?? 0) === 0 && <p className="text-xs text-leo-muted">Non in nessun team</p>}
              {(teams ?? []).map((t: any, i: number) => (
                <div key={i} className="flex items-center justify-between rounded-md border border-leo-border bg-leo-card/40 px-3 py-2 text-xs">
                  <div>
                    <Badge variant="outline" className="text-[10px] mr-2">{t.team?.team_type}</Badge>
                    <span className="font-medium">{t.team?.name}</span>
                  </div>
                  <Badge variant="green">{t.team_role}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div>
          <AuditTrailPanel entityType="person" entityId={id} showRevisions={false} />
        </div>
      </div>
    </>
  );
}
