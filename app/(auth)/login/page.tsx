import Link from "next/link";
import { LoginForm } from "./login-form";
import { LeonardoLogo } from "@/components/layout/logo";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { redirectTo?: string; error?: string };
}) {
  return (
    <div className="w-full max-w-md">
      <div className="leo-card p-8">
        <div className="mb-8 flex justify-center">
          <LeonardoLogo subtitle="QUALITY" className="scale-110" />
        </div>
        <h1 className="mb-2 text-center text-xl font-semibold text-leo-text">
          Accedi alla piattaforma
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
