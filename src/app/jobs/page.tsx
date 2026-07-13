import Link from "next/link";
import type { JobCategory, JobStatus, Prisma } from "@prisma/client";
import { Filter, Plus, Search } from "lucide-react";
import AppShell from "@/components/AppShell";
import PageHeader from "@/components/PageHeader";
import JobCard from "@/components/JobCard";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export default async function JobsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser();
  const params = await searchParams;
  const q = params.q?.trim() || "";
  const category = params.category as JobCategory | undefined;
  const status = params.status as JobStatus | undefined;
  const deadline = params.deadline || "";
  const link = params.link || "";
  const sort = params.sort || "newest";

  const filters: Prisma.JobWhereInput[] = [];
  if (q) {
    filters.push({
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { company: { contains: q, mode: "insensitive" } },
        { location: { contains: q, mode: "insensitive" } },
        { jobType: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } }
      ]
    });
  }
  if (link === "available") filters.push({ OR: [{ applyUrl: { not: null } }, { sourceUrl: { not: null } }] });

  const where: Prisma.JobWhereInput = {
    userId: user.id,
    ...(filters.length ? { AND: filters } : {}),
    ...(category ? { category } : {}),
    ...(status ? { status } : {})
  };

  if (deadline === "soon") where.deadline = { gte: new Date(), lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) };
  if (deadline === "expired") where.deadline = { lt: new Date() };
  if (deadline === "none") where.deadline = null;
  if (deadline === "future") where.deadline = { gte: new Date() };

  const orderBy: Prisma.JobOrderByWithRelationInput[] = sort === "deadline"
    ? [{ deadline: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }]
    : sort === "company"
      ? [{ company: "asc" }, { createdAt: "desc" }]
      : [{ createdAt: "desc" }];

  const jobs = await prisma.job.findMany({ where, orderBy, take: 120 });

  return (
    <AppShell>
      <PageHeader
        eyebrow="Opportunity library"
        title="Every job, deadline, and direct link in one place"
        description="Search and filter collected roles without returning to a spreadsheet or searching the company again."
        action={<Link href="/import/manual" className="btn-primary"><Plus size={16} /> Add job</Link>}
      />

      <form className="card mb-6 p-4 md:p-5" action="/jobs">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <label className="relative md:col-span-2 xl:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--subtle)]" size={17} />
            <input className="input pl-10" name="q" defaultValue={q} placeholder="Search role, company, location..." />
          </label>
          <select className="input" name="category" defaultValue={category || ""}>
            <option value="">All categories</option>
            <option value="GOVERNMENT">Government</option>
            <option value="PRIVATE_CORPORATE">Private & Corporate</option>
            <option value="ACADEMIC_RESEARCH">Academic & Research</option>
            <option value="UNCATEGORIZED">Uncategorized</option>
          </select>
          <select className="input" name="status" defaultValue={status || ""}>
            <option value="">All statuses</option>
            <option value="NEW">New</option>
            <option value="SAVED">Saved</option>
            <option value="APPLIED">Applied</option>
            <option value="INTERVIEW">Interview</option>
            <option value="OFFER">Offer</option>
            <option value="REJECTED">Rejected</option>
            <option value="ARCHIVED">Archived</option>
          </select>
          <select className="input" name="deadline" defaultValue={deadline}>
            <option value="">Any deadline</option>
            <option value="soon">Within 7 days</option>
            <option value="future">Future deadlines</option>
            <option value="expired">Expired</option>
            <option value="none">Not listed</option>
          </select>
          <select className="input" name="link" defaultValue={link}>
            <option value="">Any link status</option>
            <option value="available">Direct link available</option>
          </select>
        </div>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <select className="input sm:max-w-56" name="sort" defaultValue={sort}>
            <option value="newest">Newest collected first</option>
            <option value="deadline">Nearest deadline first</option>
            <option value="company">Company A–Z</option>
          </select>
          <div className="flex gap-2">
            <Link href="/jobs" className="btn-secondary">Clear</Link>
            <button className="btn-primary" type="submit"><Filter size={16} /> Apply filters</button>
          </div>
        </div>
      </form>

      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="text-sm text-[var(--muted)]">Showing <strong className="text-[var(--text-strong)]">{jobs.length}</strong> opportunities</div>
      </div>
      <div className="space-y-4">
        {jobs.map((job) => <JobCard key={job.id} job={job} />)}
        {!jobs.length ? <div className="empty-state"><Search className="mx-auto text-[var(--primary)]" /><h3 className="mt-3 font-bold text-[var(--text-strong)]">No jobs matched these filters</h3><p className="mt-2 text-sm text-[var(--muted)]">Clear a filter or add another source.</p></div> : null}
      </div>
    </AppShell>
  );
}
