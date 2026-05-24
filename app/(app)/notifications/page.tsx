import Link from "next/link";
import { format } from "date-fns";
import { Bell, AlertCircle, Lock, CheckCircle2, Clock } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createServerClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";
import { MarkReadButton } from "./mark-read-button";

const SEVERITY_ICON: Record<string, { icon: any; tone: string; bg: string }> = {
  info: { icon: Bell, tone: "text-leo-muted", bg: "border-leo-border" },
  reminder: { icon: Clock, tone: "text-brand-cyan", bg: "border-brand-cyan/30 bg-brand-cyan/5" },
  alert: { icon: AlertCircle, tone: "text-status-orange", bg: "border-status-orange/30 bg-status-orange/5" },
  critical: { icon: AlertCircle, tone: "text-status-red", bg: "border-status-red/30 bg-status-red/5" },
  blocking: { icon: Lock, tone: "text-status-red", bg: "border-status-red/40 bg-status-red/10" },
};

const STATUS_VARIANT: Record<string, "blue" | "gray" | "yellow" | "green" | "red"> = {
  nuova: "blue",
  letta: "gray",
  in_lavorazione: "yellow",
  risolta: "green",
  scaduta: "red",
  ignorata_con_motivazione: "gray",
};

export default async function NotificationsPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const params = await searchParams;
  const session = await requireSession();
  const supabase = await createServerClient();

  let query = supabase
    .from("notification_recipient")
    .select("id, read_at, action_taken, channel, notification:notification_id(id, title, message, severity, source_type, action_url, due_date, status, created_at, company:company_id(name))")
    .eq("person_id", session.person?.id ?? "")
    .order("created_at", { ascending: false })
    .limit(100);

  const { data: recipients } = await query;

  // Filtra in memoria per semplicità
  let filtered = recipients ?? [];
  if (params.filter === "unread") filtered = filtered.filter((r: any) => !r.read_at);
  if (params.filter === "critical") filtered = filtered.filter((r: any) => ["critical","blocking"].includes(r.notification?.severity));
  if (params.filter === "today") {
    const today = new Date().toISOString().slice(0, 10);
    filtered = filtered.filter((r: any) => r.notification?.created_at?.slice(0, 10) === today);
  }

  const unreadCount = (recipients ?? []).filter((r: any) => !r.read_at).length;

  return (
    <>
      <PageHeader
        title="Centro notifiche"
        description={`${unreadCount} non lette · ${recipients?.length ?? 0} totali`}
      />

      <div className="mb-4 flex gap-2 text-sm">
        <Link className="rounded-md border border-leo-border px-3 py-1 hover:bg-leo-card" href="/notifications">Tutte</Link>
        <Link className="rounded-md border border-leo-border px-3 py-1 hover:bg-leo-card" href="/notifications?filter=unread">Non lette ({unreadCount})</Link>
        <Link className="rounded-md border border-leo-border px-3 py-1 hover:bg-leo-card" href="/notifications?filter=critical">Critiche</Link>
        <Link className="rounded-md border border-leo-border px-3 py-1 hover:bg-leo-card" href="/notifications?filter=today">Oggi</Link>
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <Card className="leo-card">
            <CardContent className="p-12 text-center text-leo-muted">
              <CheckCircle2 className="mx-auto h-8 w-8 text-status-green mb-2" />
              Nessuna notifica con questo filtro.
            </CardContent>
          </Card>
        ) : (
          filtered.map((r: any) => {
            const n = r.notification;
            if (!n) return null;
            const sev = SEVERITY_ICON[n.severity] ?? SEVERITY_ICON.info;
            const Icon = sev.icon;
            const isUnread = !r.read_at;
            return (
              <Card key={r.id} className={`leo-card border ${sev.bg} ${isUnread ? "ring-1 ring-brand-cyan/30" : ""}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Icon className={`h-5 w-5 mt-0.5 ${sev.tone}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-medium">{n.title}</div>
                          <p className="text-sm text-leo-muted mt-0.5 whitespace-pre-line">{n.message}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <Badge variant={STATUS_VARIANT[n.status] ?? "gray"} className="text-[10px]">{n.status}</Badge>
                          <span className="text-[10px] text-leo-muted">{format(new Date(n.created_at), "dd/MM HH:mm")}</span>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        {n.company && <Badge variant="outline" className="text-[10px]">{n.company.name}</Badge>}
                        <Badge variant="outline" className="text-[10px]">{n.source_type}</Badge>
                        {n.action_url && (
                          <Button asChild size="sm" variant="outline">
                            <Link href={n.action_url}>Apri</Link>
                          </Button>
                        )}
                        {isUnread && <MarkReadButton recipientId={r.id} />}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </>
  );
}
