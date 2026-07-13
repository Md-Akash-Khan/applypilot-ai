import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseJobText, parseDeadline } from "@/lib/parser";
import { classifyJob } from "@/lib/classifier";
import { computeRelevance } from "@/lib/relevance";

const categorySchema = z.enum(["GOVERNMENT", "PRIVATE_CORPORATE", "ACADEMIC_RESEARCH", "UNCATEGORIZED"]);

const editableJobSchema = z.object({
  title: z.string().min(2),
  company: z.string().min(1),
  location: z.string().nullable().optional(),
  deadline: z.string().nullable().optional(),
  jobType: z.string().nullable().optional(),
  salary: z.string().nullable().optional(),
  description: z.string().min(1),
  requirements: z.string().nullable().optional(),
  applyUrl: z.string().nullable().optional(),
  category: categorySchema.optional()
});

const requestSchema = z.object({
  rawText: z.string().min(20),
  action: z.enum(["preview", "save"]).default("preview"),
  parsed: editableJobSchema.optional(),
  sourceUrl: z.union([z.string().url(), z.literal("")]).optional()
});

function toPreview(parsed: Awaited<ReturnType<typeof parseJobText>>) {
  return {
    title: parsed.title,
    company: parsed.company,
    location: parsed.location || "",
    deadline: parsed.deadlineDate ? parsed.deadlineDate.toISOString().slice(0, 10) : "",
    jobType: parsed.jobType || "",
    salary: parsed.salary || "",
    description: parsed.description,
    requirements: parsed.requirements || "",
    applyUrl: parsed.applyUrl || "",
    category: parsed.category
  };
}

export async function POST(request: Request) {
  const user = await requireUser();
  const body = requestSchema.parse(await request.json());
  const preferences = {
    keywords: user.settings?.roleKeywords,
    excludedKeywords: user.settings?.excludedKeywords,
    locationPreference: user.settings?.locations,
    jobTypes: user.settings?.preferredJobTypes
  };

  if (body.action === "preview") {
    const parsed = await parseJobText(body.rawText, preferences, { applyUrl: body.sourceUrl || null });
    return NextResponse.json({ parsed: toPreview(parsed) });
  }

  if (!body.parsed) {
    return NextResponse.json({ error: "Parsed job data is required before saving." }, { status: 400 });
  }

  const data = body.parsed;
  const classificationText = `${data.title}\n${data.company}\n${data.description.slice(0, 450)}`;
  const relevanceText = `${data.title}\n${data.company}\n${data.location || ""}\n${data.jobType || ""}\n${data.description}\n${data.requirements || ""}`;
  const deadline = data.deadline ? parseDeadline(data.deadline) : null;
  const directUrl = data.applyUrl?.trim() || body.sourceUrl?.trim() || null;

  const job = await prisma.job.create({
    data: {
      userId: user.id,
      title: data.title.trim(),
      company: data.company.trim(),
      location: data.location?.trim() || null,
      deadline,
      category: data.category || classifyJob(classificationText),
      jobType: data.jobType?.trim() || null,
      salary: data.salary?.trim() || null,
      description: data.description.trim().slice(0, 1000),
      requirements: data.requirements?.trim().slice(0, 1600) || null,
      applyUrl: directUrl,
      sourceUrl: directUrl,
      rawText: body.rawText.slice(0, 16000),
      relevanceScore: computeRelevance(relevanceText, preferences)
    }
  });

  await prisma.jobEvent.create({
    data: { jobId: job.id, type: "PASTE_IMPORTED", note: "Created from reviewed pasted content" }
  });

  return NextResponse.json({ job });
}
