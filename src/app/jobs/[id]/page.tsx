import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft, ArrowUpRight, Building2, CalendarDays, ExternalLink, FileText, MapPin, WalletCards } from "lucide-react";
import AppShell from "@/components/AppShell";
import PageHeader from "@/components/PageHeader";
import StatusForm from "@/components/StatusForm";
import JobActions from "@/components/JobActions";
import CompanyAvatar from "@/components/CompanyAvatar";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { categoryLabel } from "@/lib/classifier";
import { isDeadlineExpired } from "@/lib/deadline";
import StructuredJobText from "@/components/StructuredJobText";

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const job = await prisma.job.findFirst({
    where: { id, userId: user.id },
    include: { source: true, events: { orderBy: { createdAt: "desc" } } }
  });
  if (!job) notFound();

  const directLink = job.applyUrl || job.sourceUrl;
  const expired = isDeadlineExpired(job.deadline);

  return (
    <AppShell>
      <div className="mb-5">
        <Link href="/jobs" className="btn-ghost -ml-2"><ArrowLeft size={16} /> Back to jobs</Link>
      </div>
      <PageHeader
        eyebrow={categoryLabel(job.category)}
        title={job.title}
        description={`${job.company}${job.location ? ` · ${job.location}` : ""}`}
        action={directLink ? <a className="btn-primary" href={directLink} target="_blank" rel="noreferrer">Open job / apply <ArrowUpRight size={17} /></a> : undefined}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <section className="card p-5 md:p-6">
            <div className="flex flex-col gap-5 md:flex-row md:items-start">
              <CompanyAvatar company={job.company} size="lg" url={job.applyUrl || job.sourceUrl} />
              <div className="grid flex-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Meta icon={<Building2 size={16} />} label="Company" value={job.company} />
                <Meta icon={<MapPin size={16} />} label="Location" value={job.location || "Not listed"} />
                <Meta icon={<CalendarDays size={16} />} label="Deadline" value={job.deadline ? format(job.deadline, "MMM d, yyyy") : "Not listed"} tone={expired ? "danger" : job.deadline ? "warning" : undefined} />
                <Meta icon={<FileText size={16} />} label="Type" value={job.jobType || "Not listed"} />
              </div>
            </div>
          </section>

          <section className="card p-5 md:p-7">
            <div className="mb-5 flex flex-wrap gap-2">
              <span className="badge badge-primary">{categoryLabel(job.category)}</span>
              <span className="badge">{job.status.replaceAll("_", " ")}</span>
              {expired ? <span className="badge badge-danger">Deadline passed</span> : null}
            </div>
            <h2 className="section-title">Role summary</h2>
            {job.description ? <StructuredJobText text={job.description} /> : <p className="mt-3 text-sm leading-7 text-[var(--muted)]">No summary was available.</p>}

            {job.requirements ? (
              <>
                <div className="my-6 border-t border-[var(--border)]" />
                <h2 className="section-title">Essential requirements</h2>
                <StructuredJobText text={job.requirements} list />
              </>
            ) : null}
          </section>

          {directLink ? (
            <section className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-bold text-[var(--text-strong)]">Ready to continue?</h3>
                <p className="mt-1 text-sm text-[var(--muted)]">Open the original job page or application form—no Google search needed.</p>
              </div>
              <a href={directLink} target="_blank" rel="noreferrer" className="btn-primary shrink-0">Open direct link <ExternalLink size={16} /></a>
            </section>
          ) : null}
        </div>

        <aside className="space-y-5">
          <section className="card p-5">
            <h3 className="section-title">Application stage</h3>
            <p className="mb-4 mt-1 text-sm text-[var(--muted)]">Update once and the tracker board changes automatically.</p>
            <StatusForm jobId={job.id} status={job.status} />
          </section>

          <section className="card p-5">
            <h3 className="section-title">Source & compensation</h3>
            <div className="mt-4 space-y-3 text-sm">
              <InfoRow label="Source" value={job.source?.name || "Manual / pasted"} />
              {job.salary ? <InfoRow label="Salary" value={job.salary} icon={<WalletCards size={15} />} /> : null}
              {job.sourceUrl ? <a href={job.sourceUrl} target="_blank" rel="noreferrer" className="btn-secondary mt-2 w-full">Open source page <ExternalLink size={15} /></a> : null}
            </div>
          </section>

          <section className="card p-5">
            <h3 className="section-title">Workspace controls</h3>
            <p className="mb-3 mt-1 text-sm text-[var(--muted)]">Remove incorrect, duplicate, or expired records from your private workspace.</p>
            <JobActions id={job.id} title={job.title} />
          </section>

          <section className="card p-5">
            <h3 className="section-title">Activity history</h3>
            <div className="mt-4 space-y-3">
              {job.events.map((event) => (
                <div key={event.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-3">
                  <div className="text-xs font-bold text-[var(--text-strong)]">{event.type.replaceAll("_", " ")}</div>
                  <div className="mt-1 text-xs text-[var(--muted)]">{format(event.createdAt, "MMM d, yyyy · h:mm a")}</div>
                </div>
              ))}
              {!job.events.length ? <div className="text-sm text-[var(--muted)]">No activity yet.</div> : null}
            </div>
          </section>
        </aside>
      </div>
    </AppShell>
  );
}

function Meta({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone?: "danger" | "warning" }) {
  const toneClass = tone === "danger" ? "text-[var(--danger)]" : tone === "warning" ? "text-[var(--warning)]" : "text-[var(--text-strong)]";
  return <div className="rounded-xl bg-[var(--surface-muted)] p-3"><div className="flex items-center gap-2 text-xs text-[var(--muted)]">{icon} {label}</div><div className={`mt-2 text-sm font-bold ${toneClass}`}>{value}</div></div>;
}

function InfoRow({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] pb-3 last:border-0 last:pb-0"><span className="inline-flex items-center gap-1.5 text-[var(--muted)]">{icon}{label}</span><strong className="text-right text-[var(--text-strong)]">{value}</strong></div>;
}
