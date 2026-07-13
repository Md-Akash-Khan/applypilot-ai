import Image from "next/image";
import { redirect } from "next/navigation";
import { BriefcaseBusiness, DatabaseZap, Sparkles } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import ThemeToggle from "@/components/ThemeToggle";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await getCurrentUser();
  if (user) redirect("/");
  const params = await searchParams;

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-6xl overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-lg)] md:min-h-[calc(100vh-4rem)] lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative hidden overflow-hidden bg-[#111827] p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(34,211,238,.2),transparent_26rem),radial-gradient(circle_at_90%_80%,rgba(99,102,241,.32),transparent_30rem)]" />
          <div className="relative flex items-center gap-3">
            <Image src="/logo.svg" alt="ApplyPilot AI" width={48} height={48} priority />
            <div><div className="text-xl font-extrabold">ApplyPilot AI</div><div className="text-xs text-white/60">AI-assisted career workspace</div></div>
          </div>
          <div className="relative max-w-xl">
            <div className="mb-4 inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold text-cyan-200">Built to replace the endless job spreadsheet</div>
            <h1 className="text-4xl font-extrabold leading-tight tracking-[-0.04em]">Discover roles, keep every deadline, and apply from the original link.</h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-white/65">Monitor career pages automatically, extract pasted posts into useful fields, and manage your full application pipeline.</p>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <Feature icon={<DatabaseZap size={17} />} title="Source monitor" />
              <Feature icon={<Sparkles size={17} />} title="Smart extraction" />
              <Feature icon={<BriefcaseBusiness size={17} />} title="Visual tracker" />
            </div>
          </div>
          <div className="relative text-xs text-white/45">Private single-user workspace</div>
        </section>

        <section className="relative grid place-items-center p-6 md:p-10">
          <div className="absolute right-5 top-5"><ThemeToggle /></div>
          <div className="w-full max-w-md">
            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <Image src="/logo.svg" alt="ApplyPilot AI" width={46} height={46} />
              <div><div className="text-lg font-extrabold text-[var(--text-strong)]">ApplyPilot AI</div><div className="text-xs text-[var(--muted)]">Career workspace</div></div>
            </div>
            <div className="eyebrow">Secure sign in</div>
            <h2 className="text-3xl font-extrabold tracking-[-0.035em] text-[var(--text-strong)]">Welcome back</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Sign in to your private opportunity dashboard.</p>

            {params.error ? <div className="mt-6 rounded-xl border border-[var(--danger)]/30 bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">Invalid email or password.</div> : null}
            <form action="/api/auth/login" method="POST" className="mt-7 space-y-4">
              <label className="block"><span className="mb-2 block text-xs font-bold text-[var(--muted)]">Email</span><input className="input" name="email" type="email" autoComplete="email" required /></label>
              <label className="block"><span className="mb-2 block text-xs font-bold text-[var(--muted)]">Password</span><input className="input" name="password" type="password" autoComplete="current-password" required /></label>
              <button className="btn-primary w-full" type="submit">Enter workspace</button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}

function Feature({ icon, title }: { icon: React.ReactNode; title: string }) {
  return <div className="rounded-2xl border border-white/10 bg-white/5 p-3"><div className="text-cyan-200">{icon}</div><div className="mt-2 text-xs font-bold">{title}</div></div>;
}
