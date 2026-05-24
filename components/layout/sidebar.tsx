"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Workflow,
  BookCheck,
  FileText,
  CalendarClock,
  ClipboardCheck,
  AlertTriangle,
  Wrench,
  Users,
  Boxes,
  Flame,
  Hammer,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LeonardoLogo } from "./logo";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/companies", label: "Imprese", icon: Building2 },
  { href: "/processes", label: "Processi", icon: Workflow },
  { href: "/standards", label: "Norme", icon: BookCheck },
  { href: "/documents", label: "Documenti", icon: FileText },
  { href: "/deadlines", label: "Scadenze", icon: CalendarClock },
  { href: "/audits", label: "Audit", icon: ClipboardCheck },
  { href: "/non-conformities", label: "Non conformità", icon: AlertTriangle },
  { href: "/actions", label: "Azioni", icon: Wrench },
  { href: "/people", label: "Persone", icon: Users },
  { href: "/assets", label: "Asset", icon: Boxes },
  { href: "/projects", label: "Commesse", icon: Hammer },
  { href: "/welding", label: "Saldatura 1090", icon: Flame },
  { href: "/settings", label: "Impostazioni", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
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
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
