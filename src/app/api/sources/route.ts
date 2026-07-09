import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

const schema = z.object({
  name: z.string().min(2),
  url: z.string().url(),
  keywords: z.array(z.string()).default([]),
  excludedKeywords: z.array(z.string()).default([]),
  locationPreference: z.array(z.string()).default([]),
  jobTypes: z.array(z.string()).default([]),
  scanFrequency: z.enum(["MANUAL", "DAILY", "TWICE_DAILY", "WEEKLY"]).default("DAILY")
});

export async function POST(request: Request) {
  const user = await requireUser();
  const data = schema.parse(await request.json());
  const source = await prisma.jobSource.create({
    data: {
      userId: user.id,
      name: data.name,
      url: data.url,
      keywords: JSON.stringify(data.keywords),
      excludedKeywords: JSON.stringify(data.excludedKeywords),
      locationPreference: JSON.stringify(data.locationPreference),
      jobTypes: JSON.stringify(data.jobTypes),
      scanFrequency: data.scanFrequency
    }
  });
  return NextResponse.json({ source });
}
