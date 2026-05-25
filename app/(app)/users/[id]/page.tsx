import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { Shield, Users as UsersIcon, Award, KeyRound, Flame } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DeadlineBadge } from "@/components/status/deadline-badge";
import { createServerClient } from "@/lib/supabase/server";
import { AuditTrailPanel } from "@/components/audit/audit-trail-panel";
import { UserEditPanel } from "./user-edit-panel";

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerClient();

  const { data: person } = await supabase
    .from("person")
    .select("*, company:company_id(id, name), role:role_id(code, name, role_level)")
    .eq("id", id)
    .maybeSingle();
  if (!person) notFound();

  const roleCode = (person as any).role?.code as string | undefined;

  const [
    { data: companies },
    { data: roles },
    { data: assignments },
    { data: teams },
    { data: permissions },
    { data: competences },
    { data: welder },
  ] = await Promise.all([
    supabase.from("company").select("id, name").eq("active", true).order("name"),
    supabase.from("role").select("code, name, role_level").eq("active", true).order("role_level", { ascending: false }),
    supabase.from("user_assignment").select("id, entity_type, assignment_type, priority, status, due_date, created_at").eq("assigned_to_person_id", id).order("created_at", { ascending: false }).limit(20),
    supabase.from("team_member").select("team_role, joined_at, active, team:team_id(id, code, name, team_type)").eq("person_id", id),
    roleCode
      ? supabase.from("role_permission").select("resource, action, scope").eq("role_code", roleCode).order("resource").order("action")
      : Promise.resolve({ data: [] }),
    supabase.from("person_competence").select("id, status, issue_date, expiry_date, competence:competence_id(name, category, requires_expiry)").eq("person_id", id),
    supabase.from("welder_qualification").select("id, certificate_code, status, expiry_date, welding_process:welding_process_id(code, name)").eq("person_id", id),
  ]);

  // Raggruppa permessi per resource
  const permsByResource: Record<string, Array<{ action: string; scope: string }>> = {};
  for (const p of permissions ?? []) {
    const r = (p as any).resource;
    if (!permsByResource[r]) permsByResource[r] = [];
    permsByResource[r].push({ action: (p as any).action, scope: (p as any).scope });
  }
  const permResources = Object.keys(permsByResource).sort();

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

          <Card className="leo-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <KeyRound className="h-4 w-4 text-brand-cyan" />
                Permessi — risorse × azioni
                <Badge variant="outline" className="ml-auto text-[10px]">
                  {permResources.length} risorse · {(permissions ?? []).length} regole
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {roleCode === "admin_gruppo" ? (
                <div className="rounded-md border border-status-red/40 bg-status-red/10 p-3 text-xs">
                  <strong className="text-status-red">⚡ ADMIN GRUPPO</strong> — accesso a tutte le risorse e azioni (bypass RBAC).
                </div>
              ) : permResources.length === 0 ? (
                <p className="text-xs text-leo-muted">Nessun permesso esplicito definito per il ruolo <code>{roleCode ?? "—"}</code>.</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {permResources.map((res) => (
                    <div key={res} className="rounded-md border border-leo-border bg-leo-card/40 p-2">
                      <div className="text-xs font-semibold text-brand-cyan mb-1">{res === "*" ? "TUTTE LE RISORSE (*)" : res}</div>
                      <div className="flex flex-wrap gap-1">
                        {permsByResource[res].map((p, i) => (
                          <span key={i} className="inline-flex items-center gap-1 rounded-md border border-leo-border bg-leo-card px-2 py-0.5 text-[10px]">
                            <span className="font-mono text-status-green">{p.action}</span>
                            <span className="text-leo-muted">·</span>
                            <span className="font-mono text-status-yellow">{p.scope}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-3 text-[10px] text-leo-muted">
                Scope: <code>all</code>/<code>group</code> = tutto · <code>company</code> = solo impresa · <code>own</code>/<code>assigned</code> = solo propri record · <code>team</code> = team-bound.
              </div>
            </CardContent>
          </Card>

          <Card className="leo-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Award className="h-4 w-4 text-brand-cyan" /> Competenze e attestati
                <Badge variant="outline" className="ml-auto text-[10px]">{(competences ?? []).length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Competenza</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Emissione</TableHead>
                    <TableHead>Scadenza</TableHead>
                    <TableHead>Stato</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(competences ?? []).map((c: any) => (
                    <TableRow key={c.id}>
                      <TableCell>{c.competence?.name}</TableCell>
                      <TableCell><Badge variant="outline">{c.competence?.category}</Badge></TableCell>
                      <TableCell className="text-xs">{c.issue_date ? format(new Date(c.issue_date), "dd/MM/yyyy") : "—"}</TableCell>
                      <TableCell>{c.expiry_date ? <DeadlineBadge dueDate={c.expiry_date} /> : "—"}</TableCell>
                      <TableCell><Badge variant="outline">{c.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                  {(competences?.length ?? 0) === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-xs text-leo-muted py-4">
                        Nessuna competenza registrata
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {(welder?.length ?? 0) > 0 && (
            <Card className="leo-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Flame className="h-4 w-4 text-status-orange" /> Qualifiche saldatore
                  <Badge variant="outline" className="ml-auto text-[10px]">{welder?.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Certificato</TableHead>
                      <TableHead>Processo</TableHead>
                      <TableHead>Scadenza</TableHead>
                      <TableHead>Stato</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(welder ?? []).map((w: any) => (
                      <TableRow key={w.id}>
                        <TableCell className="font-mono text-xs">{w.certificate_code}</TableCell>
                        <TableCell>{w.welding_process?.code} - {w.welding_process?.name}</TableCell>
                        <TableCell><DeadlineBadge dueDate={w.expiry_date} /></TableCell>
                        <TableCell><Badge variant="outline">{w.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>

        <div>
          <AuditTrailPanel entityType="person" entityId={id} showRevisions={false} />
        </div>
      </div>
    </>
  );
}
