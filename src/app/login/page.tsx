import Image from "next/image";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await getCurrentUser();
  if (user) redirect("/");
  const params = await searchParams;

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <div className="glass w-full max-w-md rounded-[2rem] p-8">
        <div className="mb-8 flex items-center gap-3">
          <Image src="/logo.svg" alt="ApplyPilot AI" width={52} height={52} />
          <div>
            <h1 className="text-2xl font-black">ApplyPilot AI</h1>
            <p className="text-sm text-white/55">Your AI-assisted command center for every career opportunity.</p>
          </div>
        </div>
        {params.error ? <div className="mb-4 rounded-2xl border border-red-300/20 bg-red-500/10 p-3 text-sm text-red-100">Invalid email or password.</div> : null}
        <form action="/api/auth/login" method="POST" className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-bold text-white/70">Email</label>
            <input className="input" name="email" type="email" defaultValue="owner@applypilot.local" required />
          </div>
          <div>
            <label className="mb-2 block text-sm font-bold text-white/70">Password</label>
            <input className="input" name="password" type="password" defaultValue="ApplyPilot#2026" required />
          </div>
          <button className="btn-primary w-full" type="submit">Enter dashboard</button>
        </form>
      </div>
    </main>
  );
}
