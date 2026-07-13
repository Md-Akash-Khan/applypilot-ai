import Link from "next/link";
import { format, isPast } from "date-fns";
import type { Job } from "@prisma/client";
import { ArrowUpRight, Building2, CalendarDays, MapPin } from "lucide-react";
import { categoryLabel } from "@/lib/classifier";
import CompanyAvatar from "@/components/CompanyAvatar";

export default function JobCard({ job }: { job: Job }) {
  const link = job.applyUrl || job.sourceUrl;
  const expired = Boolean(job.deadline && isPast(job.deadline));
  const deadlineSoon = Boolean(job.deadline && !expired && job.deadline.getTime() < Date.now() + 1000 * 60 * 60 * 24 * 5);

  return (
    <article className="card p-5 transition duration-200 hover:-translate-y-0.5 hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-lg)]">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 flex-1 gap-4">
          <CompanyAvatar company={job.company} url={job.applyUrl || job.sourceUrl} />
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="badge badge-primary">{categoryLabel(job.category)}</span>
              <span className="badge">{job.status.replaceAll("_", " ")}</span>
              {job.jobType ? <span className="badge">{job.jobType}</span> : null}
              {deadlineSoon ? <span className="badge badge-warning">Deadline soon</span> : null}
              {expired ? <span className="badge badge-danger">Expired</span> : null}
            </div>

            <Link href={`/jobs/${job.id}`} className="block text-lg font-extrabold leading-snug tracking-[-0.02em] text-[var(--text-strong)] hover:text-[var(--primary-strong)] md:text-xl">
              {job.title}
            </Link>

            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-xs text-[var(--muted)] md:text-sm">
              <span className="inline-flex items-center gap-1.5"><Building2 size={14} /> {job.company}</span>
              {job.location ? <span className="inline-flex items-center gap-1.5"><MapPin size={14} /> {job.location}</span> : null}
              <span className="inline-flex items-center gap-1.5"><CalendarDays size={14} /> {job.deadline ? format(job.deadline, "MMM d, yyyy") : "Deadline not listed"}</span>
            </div>

            {job.description ? <p className="mt-3 line-clamp-2 max-w-4xl text-sm leading-6 text-[var(--muted)]">{job.description}</p> : null}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2 lg:justify-end">
          <Link href={`/jobs/${job.id}`} className="btn-secondary">View details</Link>
          {link ? (
            <a href={link} target="_blank" rel="noreferrer" className="btn-primary">
              Open job link <ArrowUpRight size={16} />
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}
