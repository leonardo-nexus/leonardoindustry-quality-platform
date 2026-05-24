import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { requireSession } from "@/lib/auth/session";
import { createServerClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const supabase = await createServerClient();

  let companyName: string | null = null;
  let companyLogoUrl: string | null = null;
  if (session.person?.company_id) {
    const { data } = await supabase
      .from("company")
      .select("name, logo_url")
      .eq("id", session.person.company_id)
      .maybeSingle();
    companyName = data?.name ?? null;
    companyLogoUrl = data?.logo_url ?? null;
  }

  const fullName = session.person
    ? `${session.person.first_name} ${session.person.last_name}`
    : (session.email ?? "Utente");

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar
          email={session.email}
          fullName={fullName}
          companyName={companyName}
          companyLogoUrl={companyLogoUrl}
          roleCode={session.person?.role_code ?? null}
        />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
