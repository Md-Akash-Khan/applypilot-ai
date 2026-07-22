import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BriefcaseBusiness, DatabaseZap, Sparkles } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import ThemeToggle from "@/components/ThemeToggle";

const errors: Record<string, string> = {
  invalid: "Enter a valid name, email, and a password with at least 8 characters.",
  exists: "An account already exists for this email. Sign in instead.",
  unavailable: "Your account could not be created right now. Please try again."
};

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await getCurrentUser();
  if (user) redirect("/");
  const params = await searchParams;
  const error = params.error ? errors[params.error] : null;

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="auth-shell">
        <section className="auth-hero">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(34,211,238,.2),transparent_26rem),radial-gradient(circle_at_90%_80%,rgba(99,102,241,.32),transparent_30rem)]" />
          <div className="relative flex items-center gap-3">
            <Image src="/logo.svg" alt="ApplyPilot AI" width={48} height={48} priority />
            <div><div className="text-xl font-extrabold">ApplyPilot AI</div><div className="text-xs text-white/60">AI-assisted career workspace</div></div>
          </div>
          <div className="relative max-w-xl">
            <div className="mb-4 inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold text-cyan-200">Your complete job-search workspace</div>
            <h1 className="text-4xl font-extrabold leading-tight tracking-[-0.04em]">Create your account and organize every opportunity in one place.</h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-white/65">Discover roles, save direct application links, and move each job through your personal tracker.</p>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <Feature icon={<DatabaseZap size={17} />} title="Source monitor" />
              <Feature icon={<Sparkles size={17} />} title="Smart extraction" />
              <Feature icon={<BriefcaseBusiness size={17} />} title="Visual tracker" />
            </div>
          </div>
          <div className="relative text-xs text-white/45">Secure personal workspace</div>
        </section>

        <section className="auth-form-panel">
          <div className="absolute right-5 top-5"><ThemeToggle /></div>
          <div className="w-full max-w-md">
            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <Image src="/logo.svg" alt="ApplyPilot AI" width={46} height={46} />
              <div><div className="text-lg font-extrabold text-[var(--text-strong)]">ApplyPilot AI</div><div className="text-xs text-[var(--muted)]">Career workspace</div></div>
            </div>
            <div className="eyebrow">Create account</div>
            <h2 className="text-3xl font-extrabold tracking-[-0.035em] text-[var(--text-strong)]">Start your workspace</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Use your own account to keep jobs and application progress private.</p>

            {error ? <div className="mt-6 rounded-xl border border-[var(--danger)]/30 bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">{error}</div> : null}
            <form action="/api/auth/signup" method="POST" className="mt-7 space-y-4">
              <label className="block"><span className="mb-2 block text-xs font-bold text-[var(--muted)]">Name</span><input className="input" name="name" type="text" autoComplete="name" minLength={2} maxLength={80} required /></label>
              <label className="block"><span className="mb-2 block text-xs font-bold text-[var(--muted)]">Email</span><input className="input" name="email" type="email" autoComplete="email" required /></label>
              <label className="block"><span className="mb-2 block text-xs font-bold text-[var(--muted)]">Password</span><input className="input" name="password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required /><span className="mt-2 block text-xs text-[var(--subtle)]">Use at least 8 characters.</span></label>
              <button className="btn-primary w-full" type="submit">Create account</button>
            </form>
            <p className="mt-6 text-center text-sm text-[var(--muted)]">Already have an account? <Link href="/login" className="font-bold text-[var(--primary-strong)] hover:underline">Sign in</Link></p>
          </div>
        </section>
      </div>
    </main>
  );
}

function Feature({ icon, title }: { icon: React.ReactNode; title: string }) {
  return <div className="rounded-2xl border border-white/10 bg-white/5 p-3"><div className="text-cyan-200">{icon}</div><div className="mt-2 text-xs font-bold">{title}</div></div>;
}

