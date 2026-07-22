import { format, formatDistanceToNow } from "date-fns";
import { ArrowUpRight, Clock3, DatabaseZap, ExternalLink, Radar, TriangleAlert } from "lucide-react";
import AppShell from "@/components/AppShell";
import PageHeader from "@/components/PageHeader";
import SourceForm from "@/components/SourceForm";
import SourceActions from "@/components/SourceActions";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { parseJsonArray } from "@/lib/json";
import { frequencyLabel, nextScanAt } from "@/lib/schedule";

export default async function SourcesPage() {
  const user = await requireUser();
  const sources = await prisma.jobSource.findMany({
    where: { userId: user.id },
    include: {
      logs: { orderBy: { scannedAt: "desc" }, take: 1 },
      _count: { select: { jobs: true } }
    },
    orderBy: { createdAt: "desc" }
  });

  const activeCount = sources.filter((source) => source.status === "ACTIVE" && source.scanFrequency !== "MANUAL").length;
  return (
    <AppShell>
      <PageHeader
        eyebrow="Automated sources"
        title="Monitor every career page from one workspace"
        description="ApplyPilot checks due sources automatically in the background. Multi-role career pages are split into individual jobs instead of being saved as one long page."
      />

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <InfoCard icon={<Radar size={19} />} label="Automatic monitors" value={activeCount} hint="No button clicking required" />
        <InfoCard icon={<DatabaseZap size={19} />} label="Saved sources" value={sources.length} hint="Company, government, and academic" />
        <InfoCard icon={<Clock3 size={19} />} label="Scheduler" value="Automatic" hint="Uses each source’s selected schedule" />
      </div>

      <SourceForm />

      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="section-title">Saved sources</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">Each source shows its last result and next scheduled scan.</p>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          {sources.map((source) => {
            const next = nextScanAt(source);
            const keywords = parseJsonArray(source.keywords);
            const latestLog = source.logs[0];
            const error = source.status === "ERROR";

            return (
              <article key={source.id} className="card p-5">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="mb-3 flex flex-wrap gap-2">
                      <span className={error ? "badge badge-danger" : "badge badge-success"}><span className="status-dot" /> {source.status}</span>
                      <span className="badge">{frequencyLabel(source.scanFrequency)}</span>
                      <span className="badge">{source._count.jobs} imported jobs</span>
                    </div>
                    <h3 className="text-lg font-extrabold tracking-[-0.02em] text-[var(--text-strong)]">{source.name}</h3>
                    <a href={source.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex max-w-full items-center gap-1.5 break-all text-sm font-semibold text-[var(--primary-strong)] hover:underline">
                      {source.url} <ExternalLink size={14} className="shrink-0" />
                    </a>

                    {keywords.length ? <div className="mt-4 flex flex-wrap gap-2">{keywords.map((keyword) => <span className="badge" key={keyword}>{keyword}</span>)}</div> : null}
                  </div>
                  <a href={source.url} target="_blank" rel="noreferrer" className="btn-secondary shrink-0">Open source <ArrowUpRight size={16} /></a>
                </div>

                <div className="mt-5 grid gap-3 border-t border-[var(--border)] pt-4 text-xs text-[var(--muted)] sm:grid-cols-2">
                  <div><strong className="text-[var(--text)]">Last scan:</strong> {source.lastScannedAt ? formatDistanceToNow(source.lastScannedAt, { addSuffix: true }) : "Waiting for first scheduled run"}</div>
                  <div><strong className="text-[var(--text)]">Next scan:</strong> {next ? (next.getTime() <= Date.now() ? "Queued for the next automation run" : format(next, "MMM d, h:mm a")) : "Manual only"}</div>
                  {latestLog?.message ? <div className="sm:col-span-2"><strong className="text-[var(--text)]">Latest result:</strong> {latestLog.message}</div> : null}
                  {source.lastError ? <div className="flex items-start gap-2 text-[var(--danger)] sm:col-span-2"><TriangleAlert size={15} className="mt-0.5 shrink-0" /> {source.lastError}</div> : null}
                </div>
                <SourceActions id={source.id} status={source.status} name={source.name} />
              </article>
            );
          })}
        </div>

        {!sources.length ? <div className="empty-state"><DatabaseZap className="mx-auto text-[var(--primary)]" /><h3 className="mt-3 font-bold text-[var(--text-strong)]">No sources yet</h3><p className="mt-2 text-sm text-[var(--muted)]">Add a careers page above. The first due automation run will scan it.</p></div> : null}
      </section>
    </AppShell>
  );
}

function InfoCard({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string | number; hint: string }) {
  return <div className="metric-card"><div className="flex items-start justify-between gap-4"><div><div className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">{label}</div><div className="mt-2 text-2xl font-extrabold text-[var(--text-strong)]">{value}</div><div className="mt-2 text-xs text-[var(--muted)]">{hint}</div></div><div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary-strong)]">{icon}</div></div></div>;
}
