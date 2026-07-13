import Link from "next/link";
import { addDays, endOfDay, format, startOfDay } from "date-fns";
import { BriefcaseBusiness, CalendarClock, CircleCheckBig, DatabaseZap, Plus, Sparkles } from "lucide-react";
import AppShell from "@/components/AppShell";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import JobCard from "@/components/JobCard";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { categoryLabel } from "@/lib/classifier";

export default async function DashboardPage() {
  const user = await requireUser();
  const now = new Date();
  const reminderDays = user.settings?.reminderDaysBefore || 3;
  const soon = endOfDay(addDays(now, reminderDays));

  const [total, newJobs, applied, interviews, deadlineSoon, jobs, upcoming, categories, sources] = await Promise.all([
    prisma.job.count({ where: { userId: user.id, status: { not: "ARCHIVED" } } }),
    prisma.job.count({ where: { userId: user.id, status: "NEW" } }),
    prisma.job.count({ where: { userId: user.id, status: "APPLIED" } }),
    prisma.job.count({ where: { userId: user.id, status: "INTERVIEW" } }),
    prisma.job.count({ where: { userId: user.id, deadline: { gte: startOfDay(now), lte: soon }, status: { notIn: ["ARCHIVED", "REJECTED"] } } }),
    prisma.job.findMany({ where: { userId: user.id, status: { not: "ARCHIVED" } }, orderBy: [{ createdAt: "desc" }], take: 6 }),
    prisma.job.findMany({ where: { userId: user.id, deadline: { gte: startOfDay(now) }, status: { notIn: ["ARCHIVED", "REJECTED"] } }, orderBy: { deadline: "asc" }, take: 5 }),
    prisma.job.groupBy({ by: ["category"], where: { userId: user.id, status: { not: "ARCHIVED" } }, _count: true }),
    prisma.jobSource.count({ where: { userId: user.id, status: "ACTIVE", scanFrequency: { not: "MANUAL" } } })
  ]);

  return (
    <AppShell>
      <PageHeader
        eyebrow="Career command center"
        title={`Welcome back, ${user.name.split(" ")[0] || "there"}`}
        description="Your monitored sources, saved links, deadlines, and application progress—organized in one practical workspace."
        action={
          <>
            <Link href="/sources" className="btn-secondary"><DatabaseZap size={16} /> Add source</Link>
            <Link href="/import/paste" className="btn-primary"><Sparkles size={16} /> Paste a job</Link>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Active jobs" value={total} hint={`${sources} automated sources`} icon={<BriefcaseBusiness size={19} />} />
        <StatCard label="New to review" value={newJobs} hint="Recently collected" icon={<Sparkles size={19} />} />
        <StatCard label="Deadline soon" value={deadlineSoon} hint={`Next ${reminderDays} days`} icon={<CalendarClock size={19} />} />
        <StatCard label="Applied" value={applied} hint="Applications submitted" icon={<CircleCheckBig size={19} />} />
        <StatCard label="Interviews" value={interviews} hint="Active conversations" icon={<BriefcaseBusiness size={19} />} />
      </div>

      <section className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div>
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="section-title">Latest opportunities</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">Every card includes a direct job or application link when available.</p>
            </div>
            <Link href="/jobs" className="btn-ghost">View all</Link>
          </div>
          <div className="space-y-4">{jobs.length ? jobs.map((job) => <JobCard key={job.id} job={job} />) : <EmptyState />}</div>
        </div>

        <aside className="space-y-5">
          <div className="card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="section-title">Upcoming deadlines</h3>
              <CalendarClock size={19} className="text-[var(--primary)]" />
            </div>
            <div className="space-y-3">
              {upcoming.map((job) => (
                <Link href={`/jobs/${job.id}`} key={job.id} className="block rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-3 transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]">
                  <div className="line-clamp-1 text-sm font-bold text-[var(--text-strong)]">{job.title}</div>
                  <div className="mt-1 text-xs text-[var(--muted)]">{job.company}</div>
                  <div className="mt-2 text-xs font-semibold text-[var(--warning)]">{job.deadline ? format(job.deadline, "MMM d, yyyy") : ""}</div>
                </Link>
              ))}
              {!upcoming.length ? <p className="text-sm leading-6 text-[var(--muted)]">No upcoming deadlines have been detected yet.</p> : null}
            </div>
          </div>

          <div className="card p-5">
            <h3 className="section-title">Workspace overview</h3>
            <div className="mt-4 space-y-3">
              {categories.map((item) => (
                <div key={item.category} className="flex items-center justify-between rounded-xl bg-[var(--surface-muted)] px-4 py-3 text-sm">
                  <span className="text-[var(--muted)]">{categoryLabel(item.category)}</span>
                  <strong className="text-[var(--text-strong)]">{item._count}</strong>
                </div>
              ))}
            </div>
            <div className="mt-4 grid gap-2">
              <Link className="btn-secondary" href="/import/manual"><Plus size={16} /> Add manually</Link>
              <Link className="btn-secondary" href="/applications">Open application tracker</Link>
            </div>
          </div>
        </aside>
      </section>
    </AppShell>
  );
}

function EmptyState() {
  return (
    <div className="empty-state">
      <BriefcaseBusiness className="mx-auto text-[var(--primary)]" size={30} />
      <h3 className="mt-3 font-bold text-[var(--text-strong)]">No opportunities yet</h3>
      <p className="mt-2 text-sm text-[var(--muted)]">Add a monitored source or paste a job post to begin.</p>
    </div>
  );
}
