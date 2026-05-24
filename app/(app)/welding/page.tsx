import Link from "next/link";
import { format } from "date-fns";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DeadlineBadge } from "@/components/status/deadline-badge";
import { createServerClient } from "@/lib/supabase/server";
import { StatusDonut } from "@/components/quality/quality-charts";

const WPS_VARIANT: Record<string, "green" | "yellow" | "gray"> = {
  valida: "green",
  bozza: "yellow",
  sospesa: "gray",
  obsoleta: "gray",
};
const WELD_VARIANT: Record<string, "blue" | "yellow" | "green" | "red" | "gray"> = {
  pianificata: "blue",
  autorizzata: "yellow",
  eseguita: "yellow",
  controllata: "green",
  non_conforme: "red",
  accettata: "green",
};

export default async function WeldingHubPage() {
  const supabase = await createServerClient();

  const today = new Date();
  const in30 = new Date(today); in30.setDate(today.getDate() + 30);
  const iso30 = in30.toISOString().slice(0, 10);

  const [{ data: wpsList }, { data: qualifications }, { data: welds }, { data: allWps }, { data: allQuals }, { data: allWelds }, { data: ceDossiers }] = await Promise.all([
    supabase
      .from("wps")
      .select("id, code, revision, status, welding_process:welding_process_id(code,name), company:company_id(name)")
      .eq("active", true)
      .order("code")
      .limit(50),
    supabase
      .from("welder_qualification")
      .select("id, certificate_code, expiry_date, status, person:person_id(first_name,last_name,company:company_id(name)), welding_process:welding_process_id(code)")
      .lte("expiry_date", iso30)
      .order("expiry_date")
      .limit(50),
    supabase
      .from("weld")
      .select("id, weld_number, status, welded_at, project:project_id(code,name), exc:execution_class_id(code), welder:welder_id(first_name,last_name)")
      .order("created_at", { ascending: false })
      .limit(30),
    supabase.from("wps").select("status").eq("active", true),
    supabase.from("welder_qualification").select("status, expiry_date"),
    supabase.from("weld").select("status"),
    supabase.from("ce_dossier").select("status").eq("active", true),
  ]);

  // Aggregati per donut charts
  function aggregate(rows: any[] | null, field: string): { name: string; value: number }[] {
    const map: Record<string, number> = {};
    (rows ?? []).forEach((r) => { const k = r[field] ?? "—"; map[k] = (map[k] ?? 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }
  const wpsAgg = aggregate(allWps, "status");
  const weldAgg = aggregate(allWelds, "status");
  const dossierAgg = aggregate(ceDossiers, "status");
  // Qualifiche: in_scadenza se entro 30gg
  const qualAgg: { name: string; value: number }[] = (() => {
    const map: Record<string, number> = { valida: 0, in_scadenza: 0, scaduta: 0 };
    (allQuals ?? []).forEach((q: any) => {
      if (q.status === "scaduta") map.scaduta++;
      else if (q.expiry_date && new Date(q.expiry_date) < new Date()) map.scaduta++;
      else if (q.expiry_date && new Date(q.expiry_date) <= new Date(Date.now() + 30 * 86400000)) map.in_scadenza++;
      else map.valida++;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  })();

  return (
    <>
      <PageHeader
        title="UNE-EN 1090 · Saldatura"
        description="WPS, WPQR, qualifiche saldatori, materiali, saldature, controlli e dossier CE"
      />

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Link href="/welding/wps"><Card className="hover:bg-accent transition-colors cursor-pointer"><CardContent className="p-4 text-center"><div className="font-semibold">WPS</div><div className="text-xs text-muted-foreground">Specifiche procedure</div></CardContent></Card></Link>
        <Link href="/welding/wpqr"><Card className="hover:bg-accent transition-colors cursor-pointer"><CardContent className="p-4 text-center"><div className="font-semibold">WPQR</div><div className="text-xs text-muted-foreground">Qualifiche procedure</div></CardContent></Card></Link>
        <Link href="/welding/welders"><Card className="hover:bg-accent transition-colors cursor-pointer"><CardContent className="p-4 text-center"><div className="font-semibold">Saldatori</div><div className="text-xs text-muted-foreground">Qualifiche personale</div></CardContent></Card></Link>
        <Link href="/welding/materials"><Card className="hover:bg-accent transition-colors cursor-pointer"><CardContent className="p-4 text-center"><div className="font-semibold">Materiali</div><div className="text-xs text-muted-foreground">Lotti e certificati</div></CardContent></Card></Link>
      </div>

      {/* Grafici saldatura/UNE-EN 1090 dettagliati */}
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-leo-muted">Quality Intelligence saldatura</h2>
      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-4">
        <Card className="leo-card"><CardHeader className="pb-2"><CardTitle className="text-sm">WPS per stato</CardTitle></CardHeader><CardContent><StatusDonut data={wpsAgg} /></CardContent></Card>
        <Card className="leo-card"><CardHeader className="pb-2"><CardTitle className="text-sm">Qualifiche saldatori</CardTitle></CardHeader><CardContent><StatusDonut data={qualAgg} /></CardContent></Card>
        <Card className="leo-card"><CardHeader className="pb-2"><CardTitle className="text-sm">Saldature per stato</CardTitle></CardHeader><CardContent><StatusDonut data={weldAgg} /></CardContent></Card>
        <Card className="leo-card"><CardHeader className="pb-2"><CardTitle className="text-sm">Dossier CE</CardTitle></CardHeader><CardContent><StatusDonut data={dossierAgg} /></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              WPS attive
              <Link className="text-sm underline font-normal" href="/welding/wps">Tutte →</Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Codice</TableHead>
                  <TableHead>Processo</TableHead>
                  <TableHead>Stato</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(wpsList ?? []).map((w: any) => (
                  <TableRow key={w.id}>
                    <TableCell className="font-mono text-xs">{w.code} <span className="text-muted-foreground">r{w.revision}</span></TableCell>
                    <TableCell className="text-xs">{w.welding_process?.code} - {w.welding_process?.name}</TableCell>
                    <TableCell><Badge variant={WPS_VARIANT[w.status] ?? "gray"}>{w.status}</Badge></TableCell>
                  </TableRow>
                ))}
                {(wpsList?.length ?? 0) === 0 && (
                  <TableRow><TableCell colSpan={3} className="text-center text-xs text-muted-foreground py-4">Nessuna WPS</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Qualifiche saldatori in scadenza (≤30 gg)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Saldatore</TableHead>
                  <TableHead>Processo</TableHead>
                  <TableHead>Scadenza</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(qualifications ?? []).map((q: any) => (
                  <TableRow key={q.id}>
                    <TableCell className="text-xs">{q.person?.first_name} {q.person?.last_name}</TableCell>
                    <TableCell className="text-xs">{q.welding_process?.code}</TableCell>
                    <TableCell><DeadlineBadge dueDate={q.expiry_date} /></TableCell>
                  </TableRow>
                ))}
                {(qualifications?.length ?? 0) === 0 && (
                  <TableRow><TableCell colSpan={3} className="text-center text-xs text-muted-foreground py-4">Nessuna qualifica in scadenza</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Saldature recenti
            <Link className="text-sm underline font-normal" href="/welding/welds">Tutte →</Link>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N°</TableHead>
                <TableHead>Commessa</TableHead>
                <TableHead>EXC</TableHead>
                <TableHead>Saldatore</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(welds ?? []).map((w: any) => (
                <TableRow key={w.id}>
                  <TableCell className="font-mono">{w.weld_number}</TableCell>
                  <TableCell className="text-xs">{w.project?.code} {w.project?.name}</TableCell>
                  <TableCell><Badge variant="orange">{w.exc?.code}</Badge></TableCell>
                  <TableCell className="text-xs">{w.welder?.first_name} {w.welder?.last_name}</TableCell>
                  <TableCell className="text-xs">{w.welded_at ? format(new Date(w.welded_at), "dd/MM/yyyy") : "—"}</TableCell>
                  <TableCell><Badge variant={WELD_VARIANT[w.status] ?? "gray"}>{w.status}</Badge></TableCell>
                  <TableCell><Link className="text-sm underline" href={`/welding/welds/${w.id}`}>Apri</Link></TableCell>
                </TableRow>
              ))}
              {(welds?.length ?? 0) === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-xs text-muted-foreground py-4">Nessuna saldatura registrata</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
