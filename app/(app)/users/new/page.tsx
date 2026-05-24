import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createServerClient } from "@/lib/supabase/server";
import { NewUserForm } from "./new-user-form";

export default async function NewUserPage() {
  const supabase = await createServerClient();
  const [{ data: companies }, { data: roles }] = await Promise.all([
    supabase.from("company").select("id, name").eq("active", true).order("name"),
    supabase.from("role").select("code, name, role_level").eq("active", true).order("role_level", { ascending: false }),
  ]);

  return (
    <>
      <PageHeader
        title="Nuovo utente"
        description="Crea utente: anagrafica, impresa, ruolo, lingua. L'invito Supabase va inviato dal pannello Auth dopo creazione."
        actions={<Button asChild variant="outline"><Link href="/users">← Utenti</Link></Button>}
      />
      <Card className="leo-card max-w-2xl">
        <CardContent className="p-6">
          <NewUserForm companies={companies ?? []} roles={roles ?? []} />
        </CardContent>
      </Card>
    </>
  );
}
