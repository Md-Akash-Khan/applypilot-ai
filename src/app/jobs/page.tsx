import Link from "next/link";
import type { JobCategory, JobStatus } from "@prisma/client";
import AppShell from "@/components/AppShell";
import PageHeader from "@/components/PageHeader";
import JobCard from "@/components/JobCard";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export default async function JobsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser();
  const params = await searchParams;
  const q = params.q || "";
  const category = params.category as JobCategory | undefined;
  const status = params.status as JobStatus | undefined;
  const deadline = params.deadline;

  const where: any = {
    userId: user.id,
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { company: { contains: q, mode: "insensitive" } },
            { location: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } }
          ]
        }
      : {}),
    ...(category ? { category } : {}),
    ...(status ? { status } : {})
  };

  if (deadline === "soon") {
    where.deadline = { gte: new Date(), lte: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7) };
  }
  if (deadline === "expired") {
    where.deadline = { lt: new Date() };
  }
  if (deadline === "none") {
    where.deadline = null;
  }

  const jobs = await prisma.job.findMany({ where, orderBy: [{ deadline: "asc" }, { relevanceScore: "desc" }, { createdAt: "desc" }], take: 80 });

  return (
    <AppShell>
      <PageHeader
        eyebrow="Job Board"
        title="All collected opportunities"
        description="Filter by role, deadline, company, location, category, status, and relevance score."
        action={<Link href="/import/manual" className="btn-primary">Add job</Link>}
      />

      <form className="glass mb-6 grid gap-3 rounded-3xl p-4 md:grid-cols-5" action="/jobs">
        <input className="input md:col-span-2" name="q" defaultValue={q} placeholder="Search title, company, location..." />
        <select className="input" name="category" defaultValue={category || ""}>
          <option value="">All categories</option>
          <option value="GOVERNMENT">Government</option>
          <option value="PRIVATE_CORPORATE">Private & Corporate</option>
          <option value="ACADEMIC_RESEARCH">Academic & Research</option>
          <option value="UNCATEGORIZED">Uncategorized</option>
        </select>
        <select className="input" name="status" defaultValue={status || ""}>
          <option value="">All status</option>
          <option value="NEW">New</option>
          <option value="SAVED">Saved</option>
          <option value="APPLIED">Applied</option>
          <option value="INTERVIEW">Interview</option>
          <option value="OFFER">Offer</option>
          <option value="REJECTED">Rejected</option>
          <option value="ARCHIVED">Archived</option>
        </select>
        <select className="input" name="deadline" defaultValue={deadline || ""}>
          <option value="">Any deadline</option>
          <option value="soon">Within 7 days</option>
          <option value="expired">Expired</option>
          <option value="none">No deadline</option>
        </select>
        <button className="btn-primary md:col-span-5" type="submit">Filter jobs</button>
      </form>

      <div className="mb-4 text-sm text-white/55">Showing {jobs.length} jobs</div>
      <div className="space-y-4">
        {jobs.map((job) => <JobCard key={job.id} job={job} />)}
        {!jobs.length ? <div className="glass rounded-3xl p-8 text-center text-white/60">No jobs matched your filters.</div> : null}
      </div>
    </AppShell>
  );
}
