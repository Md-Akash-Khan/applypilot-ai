import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { classifyJob } from "@/lib/classifier";
import { computeRelevance } from "@/lib/relevance";

const createJobSchema = z.object({
  title: z.string().min(2),
  company: z.string().min(1),
  location: z.string().optional().nullable(),
  deadline: z.string().optional().nullable(),
  category: z.enum(["GOVERNMENT", "PRIVATE_CORPORATE", "ACADEMIC_RESEARCH", "UNCATEGORIZED"]).optional(),
  jobType: z.string().optional().nullable(),
  salary: z.string().optional().nullable(),
  description: z.string().min(1),
  requirements: z.string().optional().nullable(),
  applyUrl: z.string().optional().nullable(),
  sourceUrl: z.string().optional().nullable()
});

export async function POST(request: Request) {
  const user = await requireUser();
  const body = await request.json();
  const data = createJobSchema.parse(body);
  const combined = `${data.title}\n${data.company}\n${data.location || ""}\n${data.jobType || ""}\n${data.description}\n${data.requirements || ""}`;
  const settings = user.settings;
  const relevanceScore = computeRelevance(combined, {
    keywords: settings?.roleKeywords,
    excludedKeywords: settings?.excludedKeywords,
    locationPreference: settings?.locations,
    jobTypes: settings?.preferredJobTypes
  });

  const job = await prisma.job.create({
    data: {
      userId: user.id,
      title: data.title,
      company: data.company,
      location: data.location || null,
      deadline: data.deadline ? new Date(data.deadline) : null,
      category: data.category || classifyJob(combined),
      jobType: data.jobType || null,
      salary: data.salary || null,
      description: data.description,
      requirements: data.requirements || null,
      applyUrl: data.applyUrl || null,
      sourceUrl: data.sourceUrl || data.applyUrl || null,
      rawText: combined,
      relevanceScore
    }
  });

  await prisma.jobEvent.create({ data: { jobId: job.id, type: "CREATED", note: "Manual job entry" } });
  return NextResponse.json({ job });
}
