import { prisma } from "@/lib/db";
import { parseJobText } from "@/lib/parser";

function looksLikeCollapsedListing(title: string, rawText: string | null, sourceId: string | null) {
  if (!sourceId) return false;
  const untitled = /^(untitled job|jobs? at|career opportunities?|open positions?)$/i.test(title.trim());
  if (!untitled) return false;
  const text = rawText || "";
  const roleSignals = text.match(/\b(engineer|developer|administrator|associate|specialist|officer|manager|analyst|lecturer|professor|research assistant)\b/gi)?.length || 0;
  return roleSignals >= 3 || text.length > 1800;
}

function hasBadTitle(title: string) {
  return /^(untitled job|fresher|freshers)$/i.test(title.trim()) || /\b(?:logo|image|banner|thumbnail)\b/i.test(title);
}

function hasBadCompany(company: string) {
  return /^(unknown company|as |we |our |you )/i.test(company.trim()) || /\b(?:we|you)\s+(?:are|will|can|should)\b/i.test(company);
}

async function main() {
  console.log("ApplyPilot data repair started...");

  const jobs = await prisma.job.findMany({
    include: { source: true },
    orderBy: { createdAt: "asc" }
  });

  const sourceIdsToRescan = new Set<string>();
  let deleted = 0;
  let updated = 0;
  let skipped = 0;

  for (const job of jobs) {
    if (looksLikeCollapsedListing(job.title, job.rawText, job.sourceId)) {
      if (job.sourceId) sourceIdsToRescan.add(job.sourceId);
      await prisma.job.delete({ where: { id: job.id } });
      deleted += 1;
      console.log(`[DELETED] Collapsed listing: ${job.title} (${job.company})`);
      continue;
    }

    const titleNeedsRepair = hasBadTitle(job.title);
    const companyNeedsRepair = hasBadCompany(job.company);
    const needsRepair = Boolean(
      job.rawText && (
        titleNeedsRepair ||
        companyNeedsRepair ||
        !job.deadline ||
        job.description.length > 1200 ||
        !job.applyUrl ||
        job.category === "UNCATEGORIZED"
      )
    );

    if (!needsRepair || !job.rawText) {
      skipped += 1;
      continue;
    }

    const parsed = await parseJobText(job.rawText, undefined, {
      title: titleNeedsRepair ? null : job.title,
      company: companyNeedsRepair ? job.source?.name || null : job.company,
      location: job.location,
      jobType: job.jobType,
      applyUrl: job.applyUrl || job.sourceUrl
    });

    const improvedTitle = titleNeedsRepair ? parsed.title : job.title;
    const improvedCompany = companyNeedsRepair ? parsed.company : job.company;
    const improvedUrl = parsed.applyUrl || job.applyUrl || job.sourceUrl;

    await prisma.job.update({
      where: { id: job.id },
      data: {
        title: improvedTitle,
        company: improvedCompany,
        location: parsed.location || job.location,
        deadline: parsed.deadlineDate || job.deadline,
        category: parsed.category,
        jobType: parsed.jobType || job.jobType,
        salary: parsed.salary || job.salary,
        description: parsed.description.slice(0, 1000),
        requirements: parsed.requirements?.slice(0, 1600) || job.requirements,
        applyUrl: improvedUrl,
        sourceUrl: improvedUrl || job.sourceUrl,
        relevanceScore: parsed.relevanceScore
      }
    });

    await prisma.jobEvent.create({
      data: {
        jobId: job.id,
        type: "DATA_REPAIRED",
        note: "Essential fields were re-extracted with the improved parser."
      }
    });

    updated += 1;
    console.log(`[UPDATED] ${improvedTitle} — ${improvedCompany}`);
  }

  if (sourceIdsToRescan.size) {
    await prisma.jobSource.updateMany({
      where: { id: { in: [...sourceIdsToRescan] } },
      data: { lastScannedAt: null, lastError: null, status: "ACTIVE" }
    });
  }

  console.log("\nRepair complete");
  console.log(`Updated jobs: ${updated}`);
  console.log(`Deleted collapsed listings: ${deleted}`);
  console.log(`Unchanged jobs: ${skipped}`);
  console.log(`Sources queued for automatic rescan: ${sourceIdsToRescan.size}`);
}

main()
  .catch((error) => {
    console.error("Data repair failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
