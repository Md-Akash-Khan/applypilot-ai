import Image from "next/image";
import { LogOut, Radar, ShieldCheck } from "lucide-react";
import { requireUser } from "@/lib/auth";
import Navigation from "@/components/Navigation";
import ThemeToggle from "@/components/ThemeToggle";

export default async function AppShell({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="app-frame">
      <aside className="app-sidebar">
        <div className="brand-block">
          <Image src="/logo.svg" alt="ApplyPilot AI" width={44} height={44} priority />
          <div className="min-w-0">
            <div className="brand-title">ApplyPilot AI</div>
            <div className="brand-subtitle">AI-assisted career workspace</div>
          </div>
        </div>

        <Navigation />

        <div className="sidebar-insight">
          <div className="sidebar-insight-title"><Radar size={17} /> Automated scanner</div>
          <p>Career sources are checked securely in the background. New matching roles appear here automatically.</p>
        </div>

        <div className="sidebar-footer">
          <div className="user-chip">
            <div className="user-avatar">{user.name?.[0]?.toUpperCase() || "U"}</div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{user.name}</div>
              <div className="truncate text-xs text-[var(--muted)]">{user.email}</div>
            </div>
            <ThemeToggle />
          </div>
          <form action="/api/auth/logout" method="POST">
            <button className="btn-ghost w-full justify-center" type="submit"><LogOut size={16} /> Sign out</button>
          </form>
        </div>
      </aside>

      <div className="app-content">
        <header className="mobile-header">
          <div className="flex items-center gap-2">
            <Image src="/logo.svg" alt="ApplyPilot AI" width={36} height={36} />
            <div>
              <div className="text-sm font-bold">ApplyPilot AI</div>
              <div className="text-[11px] text-[var(--muted)]">Career workspace</div>
            </div>
          </div>
          <ThemeToggle />
        </header>
        <div className="content-topbar">
          <div className="topbar-status"><ShieldCheck size={16} /> Private workspace · automated monitoring active</div>
          <ThemeToggle />
        </div>
        <main className="app-main">{children}</main>
      </div>
      <Navigation variant="mobile" />
    </div>
  );
}
