import { redirect } from "next/navigation";
import { BellRing, CheckCircle2, SlidersHorizontal } from "lucide-react";
import AppShell from "@/components/AppShell";
import PageHeader from "@/components/PageHeader";
import { requireUser } from "@/lib/auth";
import { parseJsonArray } from "@/lib/json";
import { prisma } from "@/lib/db";

async function updateSettings(formData: FormData) {
  "use server";
  const user = await requireUser();
  const toArray = (name: string) => JSON.stringify(String(formData.get(name) || "").split(",").map((item) => item.trim()).filter(Boolean));
  const reminderDaysBefore = Math.max(1, Math.min(30, Number(formData.get("reminderDaysBefore") || 3)));

  await prisma.userSettings.upsert({
    where: { userId: user.id },
    update: {
      roleKeywords: toArray("roleKeywords"),
      excludedKeywords: toArray("excludedKeywords"),
      locations: toArray("locations"),
      preferredJobTypes: toArray("preferredJobTypes"),
      reminderDaysBefore
    },
    create: {
      userId: user.id,
      roleKeywords: toArray("roleKeywords"),
      excludedKeywords: toArray("excludedKeywords"),
      locations: toArray("locations"),
      preferredJobTypes: toArray("preferredJobTypes"),
      reminderDaysBefore
    }
  });
  redirect("/settings?saved=1");
}

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const user = await requireUser();
  const params = await searchParams;
  const settings = user.settings;

  return (
    <AppShell>
      <PageHeader
        eyebrow="Matching preferences"
        title="Tell the scanner which opportunities matter"
        description="These rules are shared by automated source scans and pasted-job extraction. Source-specific rules take priority when provided."
      />

      {params.saved ? <div className="mb-5 flex items-center gap-2 rounded-xl border border-[var(--success)]/30 bg-[var(--success-soft)] p-4 text-sm font-semibold text-[var(--success)]"><CheckCircle2 size={18} /> Preferences saved successfully.</div> : null}

      <form action={updateSettings} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="card p-5 md:p-7">
          <div className="mb-5 flex items-start gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary-strong)]"><SlidersHorizontal size={19} /></div>
            <div>
              <h2 className="section-title">Job matching rules</h2>
              <p className="mt-1 text-sm leading-6 text-[var(--muted)]">Separate values with commas. Keep role terms specific enough to avoid unrelated jobs.</p>
            </div>
          </div>

          <div className="space-y-4">
            <Field label="Role keywords" hint="Examples: software engineer, devops, research assistant, lecturer">
              <input className="input" name="roleKeywords" defaultValue={parseJsonArray(settings?.roleKeywords).join(", ")} />
            </Field>
            <Field label="Excluded keywords" hint="Jobs containing these terms are skipped">
              <input className="input" name="excludedKeywords" defaultValue={parseJsonArray(settings?.excludedKeywords).join(", ")} />
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Preferred locations" hint="Leave empty to allow every location">
                <input className="input" name="locations" defaultValue={parseJsonArray(settings?.locations).join(", ")} />
              </Field>
              <Field label="Preferred job types" hint="Full-time, Internship, Contract, Remote...">
                <input className="input" name="preferredJobTypes" defaultValue={parseJsonArray(settings?.preferredJobTypes).join(", ")} />
              </Field>
            </div>
          </div>
        </section>

        <aside className="space-y-5">
          <section className="card p-5">
            <div className="mb-4 flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--warning-soft)] text-[var(--warning)]"><BellRing size={17} /></div><h2 className="section-title">Deadline reminder window</h2></div>
            <p className="mb-4 text-sm leading-6 text-[var(--muted)]">Dashboard highlights applications approaching this many days before their deadline.</p>
            <input className="input" name="reminderDaysBefore" type="number" min="1" max="30" defaultValue={settings?.reminderDaysBefore || 3} />
          </section>
          <button className="btn-primary w-full" type="submit">Save preferences</button>
        </aside>
      </form>
    </AppShell>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-xs font-bold text-[var(--text)]">{label}</span>{hint ? <span className="mb-2 block text-xs text-[var(--muted)]">{hint}</span> : null}{children}</label>;
}
