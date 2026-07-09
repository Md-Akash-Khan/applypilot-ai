import Link from "next/link";
import { format } from "date-fns";
import type { Job } from "@prisma/client";
import { categoryLabel } from "@/lib/classifier";

export default function JobCard({ job }: { job: Job }) {
  const deadlineSoon = job.deadline && job.deadline.getTime() < Date.now() + 1000 * 60 * 60 * 24 * 4;
  return (
    <div className="glass rounded-3xl p-5 transition hover:-translate-y-0.5 hover:border-cyan-300/30">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="mb-3 flex flex-wrap gap-2">
            <span className="badge">{categoryLabel(job.category)}</span>
            <span className="badge">{job.status}</span>
            {deadlineSoon ? <span className="badge border-orange-300/30 bg-orange-400/10 text-orange-100">Deadline Soon</span> : null}
          </div>
          <Link href={`/jobs/${job.id}`} className="text-xl font-black text-white hover:text-cyan-100">{job.title}</Link>
          <div className="mt-2 text-sm text-white/58">{job.company}{job.location ? ` • ${job.location}` : ""}</div>
          <p className="mt-4 line-clamp-2 max-w-3xl text-sm leading-6 text-white/60">{job.description}</p>
        </div>
        <div className="flex min-w-28 flex-row items-center gap-3 md:flex-col md:items-end">
          <div className="grid h-16 w-16 place-items-center rounded-full border border-cyan-300/20 bg-cyan-300/10 text-lg font-black text-cyan-100">{job.relevanceScore}</div>
          <div className="text-right text-xs text-white/48">{job.deadline ? `Due ${format(job.deadline, "MMM d, yyyy")}` : "No deadline"}</div>
        </div>
      </div>
    </div>
  );
}
