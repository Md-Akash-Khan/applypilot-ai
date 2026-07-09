import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseJobText } from "@/lib/parser";

const schema = z.object({ rawText: z.string().min(20) });

export async function POST(request: Request) {
  const user = await requireUser();
  const { rawText } = schema.parse(await request.json());
  const parsed = await parseJobText(rawText, {
    keywords: user.settings?.roleKeywords,
    excludedKeywords: user.settings?.excludedKeywords,
    locationPreference: user.settings?.locations,
    jobTypes: user.settings?.preferredJobTypes
  });

  const job = await prisma.job.create({
    data: {
      userId: user.id,
      title: parsed.title,
      company: parsed.company,
      location: parsed.location || null,
      deadline: parsed.deadlineDate,
      category: parsed.category,
      jobType: parsed.jobType || null,
      salary: parsed.salary || null,
      description: parsed.description || rawText.slice(0, 4500),
      requirements: parsed.requirements || null,
      applyUrl: parsed.applyUrl || null,
      sourceUrl: parsed.applyUrl || null,
      rawText,
      relevanceScore: parsed.relevanceScore
    }
  });

  await prisma.jobEvent.create({ data: { jobId: job.id, type: "PASTE_IMPORTED", note: "Created from pasted job content" } });
  return NextResponse.json({ job, parsed });
}
