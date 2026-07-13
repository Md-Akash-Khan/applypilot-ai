import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
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
  try {
    const user = await requireUser();
    const data = schema.parse(await request.json());
    const normalizedUrl = new URL(data.url);
    normalizedUrl.hash = "";

    const source = await prisma.jobSource.create({
      data: {
        userId: user.id,
        name: data.name.trim(),
        url: normalizedUrl.toString(),
        keywords: JSON.stringify(data.keywords),
        excludedKeywords: JSON.stringify(data.excludedKeywords),
        locationPreference: JSON.stringify(data.locationPreference),
        jobTypes: JSON.stringify(data.jobTypes),
        scanFrequency: data.scanFrequency
      }
    });
    return NextResponse.json({ source });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Enter a valid source name and public career page URL." }, { status: 400 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "This career page is already being monitored." }, { status: 409 });
    }
    console.error("Could not create source", error);
    return NextResponse.json({ error: "Could not save this source." }, { status: 500 });
  }
}
