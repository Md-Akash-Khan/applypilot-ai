import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { scanSource } from "@/lib/crawler";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const source = await prisma.jobSource.findFirst({ where: { id, userId: user.id } });
  if (!source) return NextResponse.json({ error: "Source not found" }, { status: 404 });
  const result = await scanSource(id);
  return NextResponse.json(result);
}
