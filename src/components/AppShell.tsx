import Link from "next/link";
import Image from "next/image";
import { BriefcaseBusiness, ClipboardPlus, DatabaseZap, LayoutDashboard, ListFilter, LogOut, Radar, Settings, Sparkles } from "lucide-react";
import { requireUser } from "@/lib/auth";

const nav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/jobs", label: "Jobs", icon: ListFilter },
  { href: "/sources", label: "Sources", icon: DatabaseZap },
  { href: "/import/paste", label: "Paste Parser", icon: Sparkles },
  { href: "/import/manual", label: "Manual Add", icon: ClipboardPlus },
  { href: "/applications", label: "Tracker", icon: BriefcaseBusiness },
  { href: "/settings", label: "Settings", icon: Settings }
];

export default async function AppShell({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="min-h-screen lg:flex">
      <aside className="glass sticky top-0 z-20 border-b border-white/10 lg:h-screen lg:w-72 lg:border-b-0 lg:border-r">
        <div className="flex items-center gap-3 px-5 py-5">
          <Image src="/logo.svg" alt="ApplyPilot AI" width={46} height={46} priority />
          <div>
            <div className="text-lg font-black tracking-tight">ApplyPilot AI</div>
            <div className="text-xs text-white/55">AI-assisted career radar</div>
          </div>
        </div>
        <nav className="flex gap-2 overflow-x-auto px-4 pb-4 lg:block lg:space-y-2 lg:overflow-visible">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className="flex min-w-fit items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-white/72 transition hover:bg-white/10 hover:text-white">
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mx-4 mb-4 hidden rounded-3xl border border-cyan-300/20 bg-cyan-300/10 p-4 lg:block">
          <div className="mb-2 flex items-center gap-2 text-sm font-bold text-cyan-100"><Radar size={18} /> Smart Scanner</div>
          <p className="text-xs leading-5 text-white/58">Career pages, pasted jobs, deadlines, status tracking, and AI parsing in one workspace.</p>
        </div>
        <form action="/api/auth/logout" method="POST" className="px-4 pb-5">
          <button className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white/70 hover:bg-white/10" type="submit">
            <LogOut size={16} /> Logout {user.name ? `(${user.name.split(" ")[0]})` : ""}
          </button>
        </form>
      </aside>
      <main className="flex-1 px-4 py-6 md:px-8 lg:px-10">
        {children}
      </main>
    </div>
  );
}
