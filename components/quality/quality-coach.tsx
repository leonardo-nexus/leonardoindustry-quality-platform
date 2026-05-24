import Link from "next/link";
import { format } from "date-fns";
import { Sparkles, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createServerClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";

export async function QualityCoach() {
  const session = await requireSession();
  if (!session.person) return null;
  const supabase = await createServerClient();
  const today = new Date().toISOString().slice(0, 10);
  const in7 = new Date(); in7.setDate(in7.getDate() + 7);
  const iso7 = in7.toISOString().slice(0, 10);

  // Raccoglie messaggi reali dall'utente loggato
  const messages: Array<{ tone: "info" | "warn" | "alert" | "block"; text: string; href?: string }> = [];

  // 1. Checklist assegnate aperte
  const { count: myChecklists } = await supabase
    .from("quality_checklist")
    .select("id", { count: "exact", head: true })
    .eq("responsible_id", session.person.id)
    .in("status", ["non_avviata", "in_corso"]);
  if ((myChecklists ?? 0) > 0) {
    messages.push({ tone: "info", text: `Oggi devi completare ${myChecklists} checklist assegnate.`, href: "/quality-sentinel/checklists" });
  }

  // 2. Checklist scadute (di chiunque)
  const { count: overdue } = await supabase
    .from("quality_checklist")
    .select("id", { count: "exact", head: true })
    .eq("status", "scaduta")
    .eq("active", true);
  if ((overdue ?? 0) > 0) {
    messages.push({ tone: "alert", text: `Ci sono ${overdue} checklist scadute nel gruppo.`, href: "/quality-sentinel/checklists?status=scaduta" });
  }

  // 3. Documenti mancanti
  const { count: missingDocs } = await supabase
    .from("quality_document_requirement")
    .select("id", { count: "exact", head: true })
    .eq("status", "mancante")
    .eq("active", true);
  if ((missingDocs ?? 0) > 0) {
    messages.push({ tone: "warn", text: `${missingDocs} documenti richiesti dalle commesse risultano mancanti.`, href: "/quality-sentinel" });
  }

  // 4. Blocchi operativi attivi
  const { data: blocks } = await supabase
    .from("quality_block")
    .select("description, type, severity, project:project_id(code)")
    .eq("status", "aperto")
    .eq("active", true)
    .order("opened_at", { ascending: false })
    .limit(3);
  (blocks ?? []).forEach((b: any) => {
    messages.push({
      tone: b.severity === "critical" || b.severity === "block" ? "block" : "alert",
      text: `${b.project?.code ? `Commessa ${b.project.code}: ` : ""}${b.description}`,
      href: "/quality-sentinel",
    });
  });

  // 5. NC critiche aperte
  const { count: ncCritical } = await supabase
    .from("non_conformity")
    .select("id", { count: "exact", head: true })
    .eq("severity", "critica")
    .neq("status", "chiusa")
    .eq("active", true);
  if ((ncCritical ?? 0) > 0) {
    messages.push({ tone: "block", text: `Attenzione: ${ncCritical} NC critiche aperte nel gruppo.`, href: "/non-conformities" });
  }

  // 6. Qualifiche saldatori in scadenza 7 gg
  const { count: weldersExp } = await supabase
    .from("welder_qualification")
    .select("id", { count: "exact", head: true })
    .lte("expiry_date", iso7)
    .gte("expiry_date", today)
    .eq("status", "valida");
  if ((weldersExp ?? 0) > 0) {
    messages.push({ tone: "warn", text: `${weldersExp} qualifiche saldatori scadono entro 7 giorni.`, href: "/welding/welders" });
  }

  // Limite a 6
  const display = messages.slice(0, 6);

  if (display.length === 0) {
    return (
      <Card className="leo-card border-status-green/30 bg-status-green/5">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-sm text-status-green">
            <Sparkles className="h-4 w-4" />
            Sistema sotto controllo: nessuna azione urgente per te oggi.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="leo-card border-brand-cyan/30">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-brand-cyan" /> Coach operativo · {session.person.first_name}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {display.map((m, i) => {
          const tone = m.tone === "block" ? "border-status-red/50 bg-status-red/10 text-status-red"
            : m.tone === "alert" ? "border-status-orange/50 bg-status-orange/10 text-status-orange"
            : m.tone === "warn" ? "border-status-yellow/50 bg-status-yellow/10 text-status-yellow"
            : "border-brand-cyan/30 bg-brand-cyan/5 text-leo-text";
          const body = (
            <div className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm ${tone}`}>
              <span>{m.text}</span>
              {m.href && <ArrowRight className="h-3 w-3 opacity-60" />}
            </div>
          );
          return m.href ? <Link key={i} href={m.href}>{body}</Link> : <div key={i}>{body}</div>;
        })}
      </CardContent>
    </Card>
  );
}
