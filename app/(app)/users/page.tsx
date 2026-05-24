import Link from "next/link";
import { Users as UsersIcon, Plus, Shield } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createServerClient } from "@/lib/supabase/server";
import { getCurrentLocale } from "@/lib/i18n/dictionary";

export default async function UsersIndexPage() {
  const supabase = await createServerClient();
  const locale = await getCurrentLocale();

  const { data: persons } = await supabase
    .from("person")
    .select("id, first_name, last_name, email, active, locale, company:company_id(name), role:role_id(code, name, role_level)")
    .is("deleted_at", null)
    .order("active", { ascending: false })
    .order("last_name");

  const total = persons?.length ?? 0;
  const activeCount = (persons ?? []).filter((p: any) => p.active).length;

  return (
    <>
      <PageHeader
        title={locale === "es" ? "Usuarios" : "Utenti"}
        description={`${total} ${locale === "es" ? "usuarios totales" : "utenti totali"} · ${activeCount} ${locale === "es" ? "activos" : "attivi"}`}
        actions={
          <Button asChild>
            <Link href="/users/new"><Plus className="mr-1 h-3 w-3" /> {locale === "es" ? "Nuevo usuario" : "Nuovo utente"}</Link>
          </Button>
        }
      />

      <Card className="leo-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{locale === "es" ? "Nombre" : "Nome"}</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>{locale === "es" ? "Empresa" : "Impresa"}</TableHead>
                <TableHead>{locale === "es" ? "Rol" : "Ruolo"}</TableHead>
                <TableHead>Lingua</TableHead>
                <TableHead>{locale === "es" ? "Estado" : "Stato"}</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(persons ?? []).map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.first_name} {p.last_name}</TableCell>
                  <TableCell className="text-xs">{p.email ?? "—"}</TableCell>
                  <TableCell className="text-xs">{p.company?.name ?? "—"}</TableCell>
                  <TableCell>
                    {p.role ? (
                      <Badge variant="outline" className="text-[10px]">
                        <Shield className="mr-1 h-3 w-3" /> {p.role.name}
                      </Badge>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="text-xs uppercase">{p.locale ?? "it"}</TableCell>
                  <TableCell>
                    {p.active ? <Badge variant="green">{locale === "es" ? "Activo" : "Attivo"}</Badge> : <Badge variant="gray">{locale === "es" ? "Inactivo" : "Disattivo"}</Badge>}
                  </TableCell>
                  <TableCell><Link className="text-xs text-brand-cyan underline" href={`/users/${p.id}`}>{locale === "es" ? "Abrir" : "Apri"}</Link></TableCell>
                </TableRow>
              ))}
              {total === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-6 text-sm text-leo-muted">
                    <UsersIcon className="inline h-4 w-4 mr-2" /> {locale === "es" ? "Sin usuarios" : "Nessun utente"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
