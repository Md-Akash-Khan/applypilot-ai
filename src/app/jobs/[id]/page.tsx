import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import AppShell from "@/components/AppShell";
import PageHeader from "@/components/PageHeader";
import StatusForm from "@/components/StatusForm";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { categoryLabel } from "@/lib/classifier";

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const job = await prisma.job.findFirst({ where: { id, userId: user.id }, include: { source: true, events: { orderBy: { createdAt: "desc" } } } });
  if (!job) notFound();

  return (
    <AppShell>
      <PageHeader
        eyebrow={categoryLabel(job.category)}
        title={job.title}
        description={`${job.company}${job.location ? ` • ${job.location}` : ""}`}
        action={job.applyUrl ? <a className="btn-primary" href={job.applyUrl} target="_blank" rel="noreferrer">Open apply link</a> : undefined}
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <article className="glass rounded-3xl p-6">
          <div className="mb-6 flex flex-wrap gap-2">
            <span className="badge">Score {job.relevanceScore}</span>
            <span className="badge">{job.status}</span>
            {job.jobType ? <span className="badge">{job.jobType}</span> : null}
            {job.deadline ? <span className="badge">Deadline {format(job.deadline, "MMM d, yyyy")}</span> : <span className="badge">No deadline</span>}
          </div>
          <h2 className="mb-3 text-xl font-black">Description</h2>
          <p className="whitespace-pre-wrap text-sm leading-7 text-white/68">{job.description}</p>
          {job.requirements ? <><h2 className="mb-3 mt-8 text-xl font-black">Requirements</h2><p className="whitespace-pre-wrap text-sm leading-7 text-white/68">{job.requirements}</p></> : null}
        </article>
        <aside className="space-y-4">
          <div className="glass rounded-3xl p-5">
            <h3 className="mb-4 text-lg font-black">Pipeline status</h3>
            <StatusForm jobId={job.id} status={job.status} />
          </div>
          <div className="glass rounded-3xl p-5">
            <h3 className="mb-4 text-lg font-black">Source details</h3>
            <div className="space-y-3 text-sm text-white/60">
              <div><strong className="text-white">Company:</strong> {job.company}</div>
              <div><strong className="text-white">Source:</strong> {job.source?.name || "Manual / pasted"}</div>
              {job.sourceUrl ? <div><strong className="text-white">Page:</strong> <a href={job.sourceUrl} className="text-cyan-100" target="_blank" rel="noreferrer">Open source</a></div> : null}
              {job.salary ? <div><strong className="text-white">Salary:</strong> {job.salary}</div> : null}
            </div>
          </div>
          <div className="glass rounded-3xl p-5">
            <h3 className="mb-4 text-lg font-black">History</h3>
            <div className="space-y-3">
              {job.events.map((event) => <div key={event.id} className="rounded-2xl bg-white/5 p-3 text-sm text-white/60"><strong className="text-white">{event.type}</strong><br />{format(event.createdAt, "MMM d, yyyy h:mm a")}</div>)}
              {!job.events.length ? <div className="text-sm text-white/50">No event history yet.</div> : null}
            </div>
          </div>
          <Link href="/jobs" className="btn-secondary block text-center">Back to jobs</Link>
        </aside>
      </div>
    </AppShell>
  );
}
