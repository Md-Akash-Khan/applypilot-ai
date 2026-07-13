import Link from "next/link";
import { format } from "date-fns";
import { ArrowUpRight, Bookmark, BriefcaseBusiness, CheckCircle2, Clock3, Send, ThumbsDown } from "lucide-react";
import type { JobStatus } from "@prisma/client";
import AppShell from "@/components/AppShell";
import PageHeader from "@/components/PageHeader";
import CompanyAvatar from "@/components/CompanyAvatar";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

const lanes: Array<{
  value: JobStatus;
  label: string;
  description: string;
  icon: React.ComponentType<{ size?: number }>;
  accent: string;
}> = [
  { value: "NEW", label: "To review", description: "Freshly collected", icon: Clock3, accent: "var(--accent)" },
  { value: "SAVED", label: "Saved", description: "Worth applying", icon: Bookmark, accent: "var(--primary)" },
  { value: "APPLIED", label: "Applied", description: "Submitted", icon: Send, accent: "#2563eb" },
  { value: "INTERVIEW", label: "Interview", description: "In conversation", icon: BriefcaseBusiness, accent: "#d97706" },
  { value: "OFFER", label: "Offer", description: "Successful outcome", icon: CheckCircle2, accent: "#16a34a" },
  { value: "REJECTED", label: "Rejected", description: "Closed", icon: ThumbsDown, accent: "#dc2626" }
];

export default async function ApplicationsPage() {
  const user = await requireUser();
  const laneValues = lanes.map((lane) => lane.value);
  const jobs = await prisma.job.findMany({
    where: { userId: user.id, status: { in: laneValues } },
    orderBy: [{ deadline: { sort: "asc", nulls: "last" } }, { updatedAt: "desc" }]
  });

  const activeApplications = jobs.filter((job) => ["APPLIED", "INTERVIEW", "OFFER"].includes(job.status)).length;
  const upcomingDeadlines = jobs.filter((job) => job.deadline && job.deadline.getTime() >= Date.now()).length;

  return (
    <AppShell>
      <PageHeader
        eyebrow="Application tracker"
        title="A visual pipeline for every opportunity"
        description="Your jobs move from review to saved, applied, interview, and offer. Each card keeps the deadline and direct link close at hand."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Summary label="Jobs in pipeline" value={jobs.length} />
        <Summary label="Active applications" value={activeApplications} />
        <Summary label="Upcoming deadlines" value={upcomingDeadlines} />
      </div>

      <div className="overflow-x-auto pb-4">
        <div className="grid min-w-[1560px] grid-cols-6 gap-4">
          {lanes.map((lane) => {
            const Icon = lane.icon;
            const laneJobs = jobs.filter((job) => job.status === lane.value);
            return (
              <section key={lane.value} className="card min-h-[570px] overflow-hidden">
                <div className="border-b border-[var(--border)] p-4" style={{ borderTop: `4px solid ${lane.accent}` }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="grid h-9 w-9 place-items-center rounded-xl" style={{ background: `color-mix(in srgb, ${lane.accent} 14%, transparent)`, color: lane.accent }}><Icon size={17} /></div>
                      <div>
                        <h2 className="text-sm font-extrabold text-[var(--text-strong)]">{lane.label}</h2>
                        <p className="mt-0.5 text-[11px] text-[var(--muted)]">{lane.description}</p>
                      </div>
                    </div>
                    <span className="badge">{laneJobs.length}</span>
                  </div>
                </div>

                <div className="space-y-3 p-3">
                  {laneJobs.map((job) => {
                    const directLink = job.applyUrl || job.sourceUrl;
                    return (
                      <article key={job.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--border-strong)]">
                        <div className="flex gap-3">
                          <CompanyAvatar company={job.company} size="sm" url={job.applyUrl || job.sourceUrl} />
                          <div className="min-w-0 flex-1">
                            <Link href={`/jobs/${job.id}`} className="line-clamp-2 text-sm font-extrabold leading-5 text-[var(--text-strong)] hover:text-[var(--primary-strong)]">{job.title}</Link>
                            <p className="mt-1 truncate text-xs text-[var(--muted)]">{job.company}</p>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {job.location ? <span className="badge max-w-full truncate">{job.location}</span> : null}
                          <span className={job.deadline ? "badge badge-warning" : "badge"}>{job.deadline ? format(job.deadline, "MMM d") : "No deadline"}</span>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <Link href={`/jobs/${job.id}`} className="btn-secondary px-2 py-2 text-xs">Details</Link>
                          {directLink ? <a href={directLink} target="_blank" rel="noreferrer" className="btn-primary px-2 py-2 text-xs">Job link <ArrowUpRight size={13} /></a> : <span className="btn-secondary cursor-not-allowed px-2 py-2 text-xs opacity-50">No link</span>}
                        </div>
                      </article>
                    );
                  })}
                  {!laneJobs.length ? <div className="rounded-2xl border border-dashed border-[var(--border-strong)] p-6 text-center text-xs leading-5 text-[var(--muted)]">No jobs in this stage yet.</div> : null}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}

function Summary({ label, value }: { label: string; value: number }) {
  return <div className="metric-card"><div className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">{label}</div><div className="mt-2 text-3xl font-extrabold text-[var(--text-strong)]">{value}</div></div>;
}
