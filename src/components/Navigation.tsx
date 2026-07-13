"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BriefcaseBusiness, ClipboardPlus, DatabaseZap, LayoutDashboard, ListFilter, Settings, Sparkles } from "lucide-react";

const nav = [
  { href: "/", label: "Dashboard", mobileLabel: "Home", icon: LayoutDashboard },
  { href: "/jobs", label: "Jobs", mobileLabel: "Jobs", icon: ListFilter },
  { href: "/sources", label: "Sources", mobileLabel: "Sources", icon: DatabaseZap },
  { href: "/import/paste", label: "Paste & extract", mobileLabel: "Paste", icon: Sparkles },
  { href: "/import/manual", label: "Manual add", mobileLabel: "Add", icon: ClipboardPlus },
  { href: "/applications", label: "Application tracker", mobileLabel: "Tracker", icon: BriefcaseBusiness },
  { href: "/settings", label: "Preferences", mobileLabel: "Settings", icon: Settings }
];

export default function Navigation({ variant = "sidebar" }: { variant?: "sidebar" | "mobile" }) {
  const pathname = usePathname();
  return (
    <nav className={variant === "mobile" ? "mobile-navigation" : "navigation"} aria-label={variant === "mobile" ? "Mobile navigation" : "Primary navigation"}>
      {nav.map((item) => {
        const Icon = item.icon;
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link key={item.href} href={item.href} className={active ? "nav-link nav-link-active" : "nav-link"}>
            <Icon size={18} aria-hidden="true" />
            <span>{variant === "mobile" ? item.mobileLabel : item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
