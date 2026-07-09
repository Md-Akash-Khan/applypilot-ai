import Link from "next/link";
import { addDays, endOfDay, startOfDay } from "date-fns";
import AppShell from "@/components/AppShell";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import JobCard from "@/components/JobCard";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export default async function DashboardPage() {
  const user = await requireUser();
  const now = new Date();
  const soon = endOfDay(addDays(now, user.settings?.reminderDaysBefore || 3));

  const [total, newJobs, applied, interviews, deadlineSoon, jobs, categories] = await Promise.all([
    prisma.job.count({ where: { userId: user.id, status: { not: "ARCHIVED" } } }),
    prisma.job.count({ where: { userId: user.id, status: "NEW" } }),
    prisma.job.count({ where: { userId: user.id, status: "APPLIED" } }),
    prisma.job.count({ where: { userId: user.id, status: "INTERVIEW" } }),
    prisma.job.count({ where: { userId: user.id, deadline: { gte: startOfDay(now), lte: soon }, status: { notIn: ["ARCHIVED", "REJECTED"] } } }),
    prisma.job.findMany({ where: { userId: user.id, status: { not: "ARCHIVED" } }, orderBy: [{ relevanceScore: "desc" }, { createdAt: "desc" }], take: 6 }),
    prisma.job.groupBy({ by: ["category"], where: { userId: user.id }, _count: true })
  ]);

  return (
    <AppShell>
      <PageHeader
        eyebrow="ApplyPilot AI"
        title={`Welcome back, ${user.name.split(" ")[0] || "there"}.`}
        description="Your AI-assisted command center for every career opportunity. Monitor company pages, parse pasted job posts, and track applications from one place."
        action={<Link href="/import/paste" className="btn-primary">Paste a job post</Link>}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Total jobs" value={total} hint="Active workspace" />
        <StatCard label="New matches" value={newJobs} hint="Need review" />
        <StatCard label="Deadline soon" value={deadlineSoon} hint={`${user.settings?.reminderDaysBefore || 3} day window`} />
        <StatCard label="Applied" value={applied} hint="Submitted" />
        <StatCard label="Interviews" value={interviews} hint="Pipeline" />
      </div>

      <section className="mt-8 grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black">AI-ranked opportunities</h2>
            <Link href="/jobs" className="text-sm font-bold text-cyan-100/80">View all</Link>
          </div>
          {jobs.length ? jobs.map((job) => <JobCard key={job.id} job={job} />) : <EmptyState />}
        </div>
        <aside className="space-y-4">
          <div className="glass rounded-3xl p-5">
            <h3 className="mb-4 text-lg font-black">Category split</h3>
            <div className="space-y-3">
              {categories.map((item) => (
                <div key={item.category} className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3 text-sm">
                  <span>{item.category.replaceAll("_", " ")}</span>
                  <strong>{item._count}</strong>
                </div>
              ))}
            </div>
          </div>
          <div className="glass rounded-3xl p-5">
            <h3 className="mb-2 text-lg font-black">Quick actions</h3>
            <p className="mb-4 text-sm leading-6 text-white/55">Add a career page, paste a job post, or manually save an opportunity.</p>
            <div className="grid gap-2">
              <Link className="btn-secondary text-center" href="/sources">Manage sources</Link>
              <Link className="btn-secondary text-center" href="/import/manual">Manual add</Link>
              <Link className="btn-secondary text-center" href="/applications">Application tracker</Link>
            </div>
          </div>
        </aside>
      </section>
    </AppShell>
  );
}

function EmptyState() {
  return (
    <div className="glass rounded-3xl p-8 text-center">
      <h3 className="text-xl font-black">No jobs yet</h3>
      <p className="mt-2 text-sm text-white/58">Start by adding a source or pasting a job post.</p>
    </div>
  );
}
