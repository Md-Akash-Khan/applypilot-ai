import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

const updateSchema = z.object({
  status: z.enum(["NEW", "SAVED", "APPLIED", "INTERVIEW", "OFFER", "REJECTED", "ARCHIVED", "EXPIRED"]).optional(),
  notes: z.string().optional()
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const data = updateSchema.parse(await request.json());

  const existing = await prisma.job.findFirst({ where: { id, userId: user.id } });
  if (!existing) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const job = await prisma.job.update({
    where: { id },
    data: { status: data.status || existing.status }
  });

  if (data.status && data.status !== existing.status) {
    await prisma.jobEvent.create({ data: { jobId: id, type: `STATUS_${data.status}`, note: data.notes } });
    await prisma.jobApplication.upsert({
      where: { jobId: id },
      update: { status: data.status, appliedAt: data.status === "APPLIED" ? new Date() : undefined },
      create: { userId: user.id, jobId: id, status: data.status, appliedAt: data.status === "APPLIED" ? new Date() : null }
    }).catch(() => undefined);
  }

  return NextResponse.json({ job });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const existing = await prisma.job.findFirst({ where: { id, userId: user.id } });
  if (!existing) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  await prisma.job.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
