import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

const patchSchema = z.object({
  status: z.enum(["ACTIVE", "PAUSED"]).optional(),
  scanFrequency: z.enum(["MANUAL", "DAILY", "TWICE_DAILY", "WEEKLY"]).optional()
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const existing = await prisma.jobSource.findFirst({ where: { id, userId: user.id } });
  if (!existing) return NextResponse.json({ error: "Source not found" }, { status: 404 });

  const data = patchSchema.parse(await request.json());
  const source = await prisma.jobSource.update({
    where: { id },
    data: {
      ...(data.status ? { status: data.status, lastError: data.status === "ACTIVE" ? null : existing.lastError } : {}),
      ...(data.scanFrequency ? { scanFrequency: data.scanFrequency } : {})
    }
  });

  return NextResponse.json({ source });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const existing = await prisma.jobSource.findFirst({ where: { id, userId: user.id } });
  if (!existing) return NextResponse.json({ error: "Source not found" }, { status: 404 });

  await prisma.jobSource.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
