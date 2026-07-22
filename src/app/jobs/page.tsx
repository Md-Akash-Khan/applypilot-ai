import Link from "next/link";
import type { JobCategory, JobStatus, Prisma } from "@prisma/client";
import { Plus, Search } from "lucide-react";
import AppShell from "@/components/AppShell";
import PageHeader from "@/components/PageHeader";
import JobCard from "@/components/JobCard";
import JobFilters, { type JobFilterSuggestion } from "@/components/JobFilters";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { todayBoundary } from "@/lib/deadline";
import { expandJobSearchTerms } from "@/lib/job-search";

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
    const terms = expandJobSearchTerms(q);
    filters.push({
      OR: terms.flatMap((term) => [
        { title: { contains: term, mode: "insensitive" as const } },
        { company: { contains: term, mode: "insensitive" as const } },
        { location: { contains: term, mode: "insensitive" as const } },
        { jobType: { contains: term, mode: "insensitive" as const } },
        { description: { contains: term, mode: "insensitive" as const } },
        { requirements: { contains: term, mode: "insensitive" as const } }
      ])
    });
  }
  if (link === "available") filters.push({ OR: [{ applyUrl: { not: null } }, { sourceUrl: { not: null } }] });

  const where: Prisma.JobWhereInput = {
    userId: user.id,
    ...(filters.length ? { AND: filters } : {}),
    ...(category ? { category } : {}),
    ...(status ? { status } : {})
  };

  const today = todayBoundary();
  if (deadline === "soon") where.deadline = { gte: today, lte: new Date(today.getTime() + 8 * 24 * 60 * 60 * 1000 - 1) };
  if (deadline === "expired") where.deadline = { lt: today };
  if (deadline === "none") where.deadline = null;
  if (deadline === "future") where.deadline = { gte: today };

  const orderBy: Prisma.JobOrderByWithRelationInput[] = sort === "deadline"
    ? [{ deadline: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }]
    : sort === "company"
      ? [{ company: "asc" }, { createdAt: "desc" }]
      : [{ createdAt: "desc" }];

  const [jobs, suggestionRows] = await Promise.all([
    prisma.job.findMany({ where, orderBy, take: 120 }),
    prisma.job.findMany({
      where: { userId: user.id, status: { not: "ARCHIVED" } },
      select: { title: true, company: true, location: true },
      orderBy: { updatedAt: "desc" },
      take: 250
    })
  ]);
  const suggestions: JobFilterSuggestion[] = [];
  const seen = new Set<string>();
  for (const row of suggestionRows) {
    const key = row.title.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      suggestions.push({ value: row.title, label: row.title, meta: [row.company, row.location].filter(Boolean).join(" · ") });
    }
  }

  return (
    <AppShell>
      <PageHeader
        eyebrow="Opportunity library"
        title="Every job, deadline, and direct link in one place"
        description="Search and filter collected roles without returning to a spreadsheet or searching the company again."
        action={<Link href="/import/manual" className="btn-primary"><Plus size={16} /> Add job</Link>}
      />

      <JobFilters initialQuery={q} category={category} status={status} deadline={deadline} link={link} sort={sort} suggestions={suggestions} />

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
