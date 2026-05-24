"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Workflow,
  BookCheck,
  FileText,
  ClipboardList,
  CalendarClock,
  ClipboardCheck,
  AlertTriangle,
  Wrench,
  Users,
  Boxes,
  Flame,
  Hammer,
  Settings,
  Shield,
  Bell,
  ShieldAlert,
  Package,
  ShoppingCart,
  FileSignature,
} from "lucide-react";
import { HelpCircle, UserCheck, Truck, History, Calendar as CalendarIcon, ArrowLeftRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { LeonardoLogo } from "./logo";
import { useT } from "@/lib/i18n/client";

const ALL_ROLES = "*"; // marker per "tutti i ruoli"

/**
 * roles = ruoli che possono VEDERE la voce. admin_gruppo e direzione_gruppo vedono sempre tutto.
 * fornitore + cliente_dl hanno layout/portale separato → escluse di default da sidebar interna.
 */
const NAV: { href: string; key: string; icon: any; roles: string | string[] }[] = [
  { href: "/my-work",            key: "nav.my_work",          icon: UserCheck,        roles: ALL_ROLES },
  { href: "/dashboard",          key: "nav.dashboard",        icon: LayoutDashboard,  roles: ["responsabile_qualita","responsabile_commessa","direzione_impresa","direzione_gruppo","responsabile_sicurezza","responsabile_ambiente","responsabile_saldatura","auditor","capo_cantiere","capo_officina"] },
  { href: "/quality-sentinel",   key: "nav.quality_sentinel", icon: Shield,           roles: ["responsabile_qualita","responsabile_commessa","direzione_impresa","direzione_gruppo","auditor","revisore","responsabile_saldatura","capo_cantiere","capo_officina"] },
  { href: "/quality-sentinel/risk", key: "nav.risk",          icon: ShieldAlert,      roles: ["responsabile_qualita","direzione_impresa","direzione_gruppo"] },
  { href: "/material-requests",  key: "nav.material_requests", icon: ClipboardList,   roles: ["magazzino","responsabile_commessa","responsabile_qualita","direzione_impresa","capo_cantiere","capo_officina"] },
  { href: "/material-orders",    key: "nav.material_orders",  icon: ShoppingCart,     roles: ["magazzino","responsabile_commessa","responsabile_qualita","direzione_impresa"] },
  { href: "/materials",          key: "nav.materials",        icon: Package,          roles: ["magazzino","responsabile_commessa","responsabile_qualita","direzione_impresa","capo_cantiere","capo_officina","responsabile_saldatura"] },
  { href: "/materials/receptions", key: "nav.receptions",     icon: Package,          roles: ["magazzino","operatore","capo_cantiere","capo_officina","responsabile_commessa","responsabile_qualita"] },
  { href: "/suppliers",          key: "nav.suppliers",        icon: Truck,            roles: ["responsabile_qualita","direzione_impresa","direzione_gruppo","responsabile_commessa"] },
  { href: "/notifications",      key: "nav.notifications",    icon: Bell,             roles: ALL_ROLES },
  { href: "/companies",          key: "nav.companies",        icon: Building2,        roles: ["direzione_impresa","direzione_gruppo"] },
  { href: "/processes",          key: "nav.processes",        icon: Workflow,         roles: ["responsabile_qualita","responsabile_sicurezza","responsabile_ambiente","direzione_impresa","direzione_gruppo","auditor"] },
  { href: "/standards",          key: "nav.standards",        icon: BookCheck,        roles: ["responsabile_qualita","auditor","direzione_impresa","direzione_gruppo"] },
  { href: "/documents",          key: "nav.documents",        icon: FileText,         roles: ["responsabile_qualita","revisore","auditor","responsabile_commessa","responsabile_saldatura","responsabile_sicurezza","responsabile_ambiente","direzione_impresa","direzione_gruppo"] },
  { href: "/forms",              key: "nav.forms",            icon: FileSignature,    roles: ALL_ROLES },
  { href: "/calendar",           key: "nav.calendar",         icon: CalendarIcon,     roles: ALL_ROLES },
  { href: "/deadlines",          key: "nav.deadlines",        icon: CalendarClock,    roles: ["responsabile_qualita","responsabile_commessa","direzione_impresa","direzione_gruppo","capo_cantiere","capo_officina"] },
  { href: "/audits",             key: "nav.audits",           icon: ClipboardCheck,   roles: ["auditor","responsabile_qualita","direzione_impresa","direzione_gruppo"] },
  { href: "/non-conformities",   key: "nav.non_conformities", icon: AlertTriangle,    roles: ["responsabile_qualita","responsabile_commessa","auditor","direzione_impresa","direzione_gruppo","responsabile_saldatura"] },
  { href: "/actions",            key: "nav.actions",          icon: Wrench,           roles: ["responsabile_qualita","responsabile_commessa","operatore","auditor","direzione_impresa","direzione_gruppo"] },
  { href: "/people",             key: "nav.people",           icon: Users,            roles: ["responsabile_qualita","direzione_impresa","direzione_gruppo"] },
  { href: "/users",              key: "nav.users",            icon: Users,            roles: ["direzione_impresa","direzione_gruppo"] },
  { href: "/assets",             key: "nav.assets",           icon: Boxes,            roles: ["responsabile_qualita","responsabile_commessa","capo_cantiere","capo_officina","magazzino","direzione_impresa","direzione_gruppo","responsabile_saldatura"] },
  { href: "/projects",           key: "nav.projects",         icon: Hammer,           roles: ["responsabile_qualita","responsabile_commessa","auditor","direzione_impresa","direzione_gruppo","responsabile_saldatura","capo_cantiere","capo_officina"] },
  { href: "/welding",            key: "nav.welding",          icon: Flame,            roles: ["responsabile_saldatura","saldatore","auditor","responsabile_qualita","direzione_impresa","direzione_gruppo"] },
  { href: "/audit-log",          key: "nav.audit_log",        icon: History,          roles: ["responsabile_qualita","auditor","direzione_impresa","direzione_gruppo"] },
  { href: "/integrations/erp-quality", key: "nav.erp_integration", icon: ArrowLeftRight, roles: ["direzione_gruppo","direzione_impresa","responsabile_qualita"] },
  { href: "/help",               key: "nav.help",             icon: HelpCircle,       roles: ALL_ROLES },
  { href: "/settings",           key: "nav.settings",         icon: Settings,         roles: ["direzione_gruppo"] },
];

function canSee(roleCode: string | null | undefined, allowed: string | string[]): boolean {
  if (!roleCode) return false;
  // admin sempre vede tutto
  if (roleCode === "admin_gruppo" || roleCode === "direzione_gruppo") return true;
  if (allowed === ALL_ROLES) return true;
  if (Array.isArray(allowed)) return allowed.includes(roleCode);
  return false;
}

export function Sidebar({ roleCode }: { roleCode?: string | null }) {
  const pathname = usePathname();
  const { t } = useT();

  // fornitore e cliente_dl hanno layout separato (/supplier-portal): mostriamo sidebar minimale
  const isSupplier = roleCode === "fornitore";
  const isReadOnly = roleCode === "cliente_dl";

  const visibleNav = NAV.filter((item) => canSee(roleCode, item.roles));

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col bg-leo-sidebar border-r border-leo-border">
      <div className="flex h-16 items-center border-b border-leo-border px-4">
        <LeonardoLogo subtitle="QUALITY" />
      </div>
      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {(isSupplier || isReadOnly) ? (
          <>
            <NavLink href={isSupplier ? "/supplier-portal" : "/dashboard"} label={isSupplier ? "Portale fornitore" : "Dashboard"} Icon={UserCheck} active={pathname === (isSupplier ? "/supplier-portal" : "/dashboard")} />
            <NavLink href="/notifications" label={t("nav.notifications")} Icon={Bell} active={pathname === "/notifications"} />
            <NavLink href="/help" label={t("nav.help")} Icon={HelpCircle} active={pathname === "/help"} />
          </>
        ) : (
          visibleNav.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              label={t(item.key)}
              Icon={item.icon}
              active={pathname === item.href || pathname.startsWith(item.href + "/")}
            />
          ))
        )}
        {visibleNav.length === 0 && !isSupplier && !isReadOnly && (
          <p className="px-3 py-2 text-xs text-leo-muted">Nessuna voce abilitata per il ruolo {roleCode}</p>
        )}
      </nav>
      <div className="border-t border-leo-border p-3 text-[10px] text-leo-muted">
        Ruolo: <span className="text-brand-cyan">{roleCode ?? "—"}</span>
      </div>
    </aside>
  );
}

function NavLink({ href, label, Icon, active }: { href: string; label: string; Icon: any; active: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-all",
        active
          ? "bg-gradient-to-r from-brand-blue/20 via-brand-cyan/10 to-transparent text-white border-l-2 border-brand-cyan"
          : "text-leo-muted hover:bg-leo-card/60 hover:text-white",
      )}
    >
      <Icon className={cn("h-4 w-4 shrink-0", active ? "text-brand-cyan" : "text-leo-muted group-hover:text-white")} />
      <span>{label}</span>
    </Link>
  );
}
