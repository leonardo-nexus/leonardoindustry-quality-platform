import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ROLE_LABELS, APP_ROLES } from "@/lib/auth/roles";

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        title="Impostazioni"
        description="Configurazione gruppo, ruoli e parametri di sistema"
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Ruoli configurati</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {APP_ROLES.map((r) => (
                <li key={r} className="flex justify-between border-b pb-1">
                  <span>{ROLE_LABELS[r]}</span>
                  <code className="text-xs text-muted-foreground">{r}</code>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Bucket storage</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li><code>documents</code> — procedure, istruzioni, registri</li>
              <li><code>evidence</code> — evidenze operative</li>
              <li><code>welding</code> — WPS, WPQR, qualifiche saldatori</li>
              <li><code>certificates</code> — certificati materiali, attestati</li>
              <li><code>audit-reports</code> — report audit</li>
              <li><code>ce-dossiers</code> — fascicoli CE / UNE-EN 1090</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
