import Link from "next/link";
import { format } from "date-fns";
import AppShell from "@/components/AppShell";
import PageHeader from "@/components/PageHeader";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

const lanes = ["SAVED", "APPLIED", "INTERVIEW", "OFFER", "REJECTED"] as const;

export default async function ApplicationsPage() {
  const user = await requireUser();
  const jobs = await prisma.job.findMany({ where: { userId: user.id, status: { in: [...lanes] } }, orderBy: [{ updatedAt: "desc" }] });
  return (
    <AppShell>
      <PageHeader
        eyebrow="Application Tracker"
        title="Pipeline board"
        description="Move jobs through Saved, Applied, Interview, Offer, and Rejected from the job detail page."
      />
      <div className="grid gap-4 xl:grid-cols-5">
        {lanes.map((lane) => (
          <section key={lane} className="glass min-h-96 rounded-3xl p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-black">{lane}</h2>
              <span className="badge">{jobs.filter((job) => job.status === lane).length}</span>
            </div>
            <div className="space-y-3">
              {jobs.filter((job) => job.status === lane).map((job) => (
                <Link href={`/jobs/${job.id}`} key={job.id} className="block rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:bg-white/10">
                  <h3 className="text-sm font-black text-white">{job.title}</h3>
                  <p className="mt-1 text-xs text-white/55">{job.company}</p>
                  <p className="mt-2 text-xs text-cyan-100/70">{job.deadline ? `Deadline ${format(job.deadline, "MMM d")}` : "No deadline"}</p>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </AppShell>
  );
}
