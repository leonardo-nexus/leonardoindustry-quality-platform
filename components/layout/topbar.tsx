import { LogOut, User, HelpCircle } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "./language-switcher";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROLE_LABELS, type AppRole } from "@/lib/auth/roles";
import { signOutAction } from "@/app/(auth)/login/actions";
import { CompanyLogo } from "./company-logo";

export function Topbar({
  email,
  fullName,
  companyName,
  companyLogoUrl,
  roleCode,
}: {
  email: string | null;
  fullName: string;
  companyName: string | null;
  companyLogoUrl?: string | null;
  roleCode: AppRole | null;
}) {
  async function handleSignOut() {
    "use server";
    await signOutAction();
    redirect("/login");
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-leo-border bg-leo-sidebar/60 backdrop-blur-sm px-6">
      <div className="flex items-center gap-3 text-sm">
        {companyName && (
          <div className="flex items-center gap-2">
            <CompanyLogo name={companyName} logoUrl={companyLogoUrl ?? null} size="xs" />
            <span className="inline-flex items-center rounded-md border border-brand-cyan/40 bg-brand-cyan/10 px-2.5 py-1 text-xs font-medium text-brand-cyan">
              {companyName}
            </span>
          </div>
        )}
        {roleCode && (
          <span className="inline-flex items-center rounded-md border border-brand-green/40 bg-brand-green/10 px-2.5 py-1 text-xs font-medium text-brand-green">
            {ROLE_LABELS[roleCode]}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <LanguageSwitcher />
        <Button asChild variant="ghost" size="sm" className="px-2 text-leo-muted hover:text-brand-cyan" aria-label="Guida operativa">
          <Link href="/help"><HelpCircle className="h-4 w-4" /></Link>
        </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2 text-leo-text hover:bg-leo-card/60">
            <User className="h-4 w-4" />
            {fullName}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="font-medium">{fullName}</div>
            <div className="text-xs text-muted-foreground">{email}</div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <form action={handleSignOut}>
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
            >
              <LogOut className="h-4 w-4" />
              Esci
            </button>
          </form>
        </DropdownMenuContent>
      </DropdownMenu>
      </div>
    </header>
  );
}
