import AppShell from "@/components/AppShell";
import PageHeader from "@/components/PageHeader";
import { requireUser } from "@/lib/auth";
import { parseJsonArray } from "@/lib/json";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";

async function updateSettings(formData: FormData) {
  "use server";
  const user = await requireUser();
  const toArray = (name: string) => JSON.stringify(String(formData.get(name) || "").split(",").map((item) => item.trim()).filter(Boolean));
  await prisma.userSettings.upsert({
    where: { userId: user.id },
    update: {
      roleKeywords: toArray("roleKeywords"),
      excludedKeywords: toArray("excludedKeywords"),
      locations: toArray("locations"),
      preferredJobTypes: toArray("preferredJobTypes"),
      reminderDaysBefore: Number(formData.get("reminderDaysBefore") || 3)
    },
    create: {
      userId: user.id,
      roleKeywords: toArray("roleKeywords"),
      excludedKeywords: toArray("excludedKeywords"),
      locations: toArray("locations"),
      preferredJobTypes: toArray("preferredJobTypes"),
      reminderDaysBefore: Number(formData.get("reminderDaysBefore") || 3)
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
        eyebrow="Preferences"
        title="Tune your AI matching rules"
        description="These defaults are used by paste parsing, manual relevance scoring, and source scanning."
      />
      {params.saved ? <div className="mb-4 rounded-2xl border border-cyan-300/20 bg-cyan-500/10 p-3 text-sm text-cyan-100">Settings saved.</div> : null}
      <form action={updateSettings} className="glass grid gap-5 rounded-3xl p-5">
        <div>
          <label className="mb-2 block text-sm font-bold text-white/70">Role keywords</label>
          <input className="input" name="roleKeywords" defaultValue={parseJsonArray(settings?.roleKeywords).join(", ")} />
        </div>
        <div>
          <label className="mb-2 block text-sm font-bold text-white/70">Excluded keywords</label>
          <input className="input" name="excludedKeywords" defaultValue={parseJsonArray(settings?.excludedKeywords).join(", ")} />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-bold text-white/70">Locations</label>
            <input className="input" name="locations" defaultValue={parseJsonArray(settings?.locations).join(", ")} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-bold text-white/70">Preferred job types</label>
            <input className="input" name="preferredJobTypes" defaultValue={parseJsonArray(settings?.preferredJobTypes).join(", ")} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-bold text-white/70">Reminder days before deadline</label>
            <input className="input" name="reminderDaysBefore" type="number" min="1" max="30" defaultValue={settings?.reminderDaysBefore || 3} />
          </div>
        </div>
        <button className="btn-primary" type="submit">Save preferences</button>
      </form>
    </AppShell>
  );
}
