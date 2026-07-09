import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { scanSource } from "@/lib/crawler";

export async function POST() {
  const user = await requireUser();
  const sources = await prisma.jobSource.findMany({ where: { userId: user.id, status: { not: "PAUSED" } } });
  const results = [];
  for (const source of sources) {
    try {
      const result = await scanSource(source.id);
      results.push({ source: source.name, ...result });
    } catch (error) {
      results.push({ source: source.name, error: error instanceof Error ? error.message : "Unknown error" });
    }
  }
  return NextResponse.json({ results });
}
