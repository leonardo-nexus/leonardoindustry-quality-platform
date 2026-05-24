import Link from "next/link";
import { format } from "date-fns";
import { Inbox, Upload, CheckCircle2, AlertTriangle, FileText } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createServerClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";

export default async function SupplierPortalPage() {
  const session = await requireSession();
  if (!session.person) return <div className="p-6">Profilo persona mancante</div>;

  // Per ora identifichiamo il fornitore tramite email persona = supplier_email
  // (in produzione: tabella supplier separata collegata a user)
  const supabase = await createServerClient();

  const myEmail = session.email;
  const { data: myRequests } = await supabase
    .from("quality_request")
    .select("id, subject, description, due_date, status, attachment_file_id")
    .eq("recipient_person_id", session.person.id)
    .order("due_date", { ascending: true });

  const { data: myOrders } = myEmail ? await supabase
    .from("material_order")
    .select("id, order_code, status, expected_delivery, supplier_name, project:project_id(code), company:company_id(name)")
    .eq("supplier_email", myEmail)
    .order("created_at", { ascending: false })
    : { data: [] };

  const { data: myAuths } = myEmail ? await supabase
    .from("supplier_authorization")
    .select("id, gate_type, status, created_at, order:material_order_id(order_code, supplier_email)")
    .order("created_at", { ascending: false }) : { data: [] };

  const filteredAuths = (myAuths ?? []).filter((a: any) => a.order?.supplier_email === myEmail);

  const overdue = (myRequests ?? []).filter((r: any) => r.due_date && new Date(r.due_date) < new Date()).length;

  return (
    <>
      <PageHeader
        title="Portale fornitore"
        description={`Solo le tue richieste, autorizzazioni e ordini. ${overdue > 0 ? `${overdue} richieste scadute.` : ""}`}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Richieste documentali */}
        <Card className="leo-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Inbox className="h-4 w-4" /> Richieste documentali ({myRequests?.length ?? 0})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(myRequests?.length ?? 0) === 0 && <p className="text-sm text-leo-muted">Nessuna richiesta aperta</p>}
            {(myRequests ?? []).map((r: any) => {
              const isOverdue = r.due_date && new Date(r.due_date) < new Date();
              return (
                <div key={r.id} className={`mobile-card text-sm ${isOverdue ? "border-status-red/40 bg-status-red/5" : "border-leo-border"}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{r.subject}</span>
                    <Badge variant={isOverdue ? "red" : r.status === "in_verifica" ? "green" : "yellow"}>{r.status}</Badge>
                  </div>
                  {r.description && <p className="mt-1 text-xs text-leo-muted">{r.description}</p>}
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="text-leo-muted">Scadenza: {r.due_date ? format(new Date(r.due_date), "dd/MM/yyyy") : "—"}</span>
                    {!r.attachment_file_id && (
                      <button className="mobile-action inline-flex items-center gap-1 rounded-md border border-brand-cyan/40 bg-brand-cyan/10 px-3 text-brand-cyan">
                        <Upload className="h-4 w-4" /> Carica documento
                      </button>
                    )}
                    {r.attachment_file_id && <Badge variant="green"><CheckCircle2 className="mr-1 h-3 w-3" /> Caricato</Badge>}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Ordini */}
        <Card className="leo-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><FileText className="h-4 w-4" /> Miei ordini ({myOrders?.length ?? 0})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(myOrders?.length ?? 0) === 0 && <p className="text-sm text-leo-muted">Nessun ordine collegato a {myEmail}</p>}
            {(myOrders ?? []).map((o: any) => (
              <div key={o.id} className="mobile-card border-leo-border text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-brand-cyan">{o.order_code}</span>
                  <Badge variant="outline">{o.status}</Badge>
                </div>
                <p className="text-xs text-leo-muted mt-1">
                  {o.company?.name} {o.project?.code && `· ${o.project.code}`}
                  {o.expected_delivery && ` · consegna ${format(new Date(o.expected_delivery), "dd/MM/yyyy")}`}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Autorizzazioni */}
        <Card className="leo-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><CheckCircle2 className="h-4 w-4" /> Autorizzazioni ricevute ({filteredAuths.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {filteredAuths.length === 0 && <p className="text-sm text-leo-muted">Nessuna autorizzazione</p>}
            {filteredAuths.map((a: any) => (
              <div key={a.id} className="flex items-center justify-between rounded-md border border-leo-border bg-leo-card/40 px-3 py-2 text-xs">
                <div>
                  <Badge variant="outline" className="mr-2">{a.gate_type}</Badge>
                  ordine {a.order?.order_code} · {format(new Date(a.created_at), "dd/MM/yyyy HH:mm")}
                </div>
                <Badge variant={a.status === "autorizzata" ? "green" : "yellow"}>{a.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Avviso privacy */}
        <Card className="leo-card border-leo-border/50 lg:col-span-2">
          <CardContent className="p-4 text-xs text-leo-muted">
            <AlertTriangle className="inline h-3 w-3 mr-1" /> Questo portale mostra solo i tuoi documenti, ordini e autorizzazioni. Non puoi vedere dati interni del cliente o di altri fornitori.
          </CardContent>
        </Card>
      </div>
    </>
  );
}
