import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { QualityPopupLoader } from "@/components/quality/quality-popup-loader";
import { requireSession } from "@/lib/auth/session";
import { createServerClient } from "@/lib/supabase/server";
import { I18nProvider } from "@/lib/i18n/client";
import { getCurrentLocale, getDictionary } from "@/lib/i18n/dictionary";
import { OcaCertificationBadges } from "@/components/layout/oca-certification-badges";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const supabase = await createServerClient();
  const [locale, dict] = await Promise.all([getCurrentLocale(), getDictionary()]);

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
    <I18nProvider dict={dict} locale={locale}>
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
          <main className="flex-1 overflow-y-auto p-6">
            {children}
            <footer className="mt-8 flex flex-wrap items-center justify-between gap-2 border-t border-leo-border pt-3 text-[10px] text-leo-muted">
              <span>© Leonardoindustry Quality Platform</span>
              <OcaCertificationBadges variant="compact" locale={locale} />
            </footer>
          </main>
        </div>
        <QualityPopupLoader />
      </div>
    </I18nProvider>
  );
}
