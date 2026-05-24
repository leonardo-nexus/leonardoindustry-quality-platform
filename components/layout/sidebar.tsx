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
} from "lucide-react";
import { HelpCircle, UserCheck, Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import { LeonardoLogo } from "./logo";
import { useT } from "@/lib/i18n/client";

const NAV = [
  { href: "/my-work", key: "nav.my_work", icon: UserCheck },
  { href: "/dashboard", key: "nav.dashboard", icon: LayoutDashboard },
  { href: "/quality-sentinel", key: "nav.quality_sentinel", icon: Shield },
  { href: "/quality-sentinel/risk", key: "nav.risk", icon: ShieldAlert },
  { href: "/materials", key: "nav.materials", icon: Package },
  { href: "/materials/receptions", key: "nav.receptions", icon: Package },
  { href: "/suppliers", key: "nav.suppliers", icon: Truck },
  { href: "/notifications", key: "nav.notifications", icon: Bell },
  { href: "/companies", key: "nav.companies", icon: Building2 },
  { href: "/processes", key: "nav.processes", icon: Workflow },
  { href: "/standards", key: "nav.standards", icon: BookCheck },
  { href: "/documents", key: "nav.documents", icon: FileText },
  { href: "/forms", key: "nav.forms", icon: ClipboardList },
  { href: "/deadlines", key: "nav.deadlines", icon: CalendarClock },
  { href: "/audits", key: "nav.audits", icon: ClipboardCheck },
  { href: "/non-conformities", key: "nav.non_conformities", icon: AlertTriangle },
  { href: "/actions", key: "nav.actions", icon: Wrench },
  { href: "/people", key: "nav.people", icon: Users },
  { href: "/users", key: "nav.users", icon: Users },
  { href: "/assets", key: "nav.assets", icon: Boxes },
  { href: "/projects", key: "nav.projects", icon: Hammer },
  { href: "/welding", key: "nav.welding", icon: Flame },
  { href: "/help", key: "nav.help", icon: HelpCircle },
  { href: "/settings", key: "nav.settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useT();
  return (
    <aside className="hidden md:flex md:w-64 md:flex-col bg-leo-sidebar border-r border-leo-border">
      <div className="flex h-16 items-center border-b border-leo-border px-4">
        <LeonardoLogo subtitle="QUALITY" />
      </div>
      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-all",
                active
                  ? "bg-gradient-to-r from-brand-blue/20 via-brand-cyan/10 to-transparent text-white border-l-2 border-brand-cyan"
                  : "text-leo-muted hover:bg-leo-card/60 hover:text-white",
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0",
                  active ? "text-brand-cyan" : "text-leo-muted group-hover:text-white",
                )}
              />
              <span>{t(item.key)}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
