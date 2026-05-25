import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "./login-form";
import { LeonardoLogo } from "@/components/layout/logo";

function getErpQualityEntry(returnTo?: string) {
  const raw = process.env.NEXT_PUBLIC_ERP_URL ?? process.env.ERP_RETURN_URL;
  if (!raw) return null;
  try {
    const base = new URL(raw);
    base.pathname = "/quality";
    base.search = "";
    base.hash = "";
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    const target = returnTo?.startsWith("/")
      ? `${appUrl?.replace(/\/$/, "") ?? ""}${returnTo}`
      : appUrl;
    if (target) base.searchParams.set("return_to", target);
    return base.toString();
  } catch {
    return null;
  }
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: { redirectTo?: string; error?: string; local?: string };
}) {
  if (searchParams.local !== "1" && process.env.ENABLE_ERP_SSO !== "false") {
    const erpUrl = getErpQualityEntry(searchParams.redirectTo);
    if (erpUrl) redirect(erpUrl);
  }

  return (
    <div className="w-full max-w-md">
      <div className="leo-card p-8">
        <div className="mb-8 flex justify-center">
          <LeonardoLogo subtitle="QUALITY" className="scale-110" />
        </div>
        <h1 className="mb-2 text-center text-xl font-semibold text-leo-text">
          Accesso locale di emergenza
        </h1>
        <p className="mb-6 text-center text-sm text-leo-muted">
          Sistema integrato qualità · sicurezza · ambiente · saldatura
        </p>
        <LoginForm redirectTo={searchParams.redirectTo} error={searchParams.error} />
        <div className="mt-4 text-center text-sm">
          <Link href="/recover" className="text-brand-cyan hover:underline">
            Hai dimenticato la password?
          </Link>
        </div>
      </div>
      <p className="mt-6 text-center text-xs text-leo-muted">
        © Leonardoindustry · Gruppo · 9 imprese
      </p>
    </div>
  );
}
