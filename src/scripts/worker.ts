import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import { prisma } from "@/lib/db";
import { scanSource } from "@/lib/crawler";

const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", { maxRetriesPerRequest: null });
const queue = new Queue("applypilot-scans", { connection: connection as any });

function dueMs(frequency: string) {
  if (frequency === "TWICE_DAILY") return 1000 * 60 * 60 * 12;
  if (frequency === "WEEKLY") return 1000 * 60 * 60 * 24 * 7;
  if (frequency === "DAILY") return 1000 * 60 * 60 * 24;
  return Number.POSITIVE_INFINITY;
}

async function enqueueDueSources() {
  const sources = await prisma.jobSource.findMany({ where: { status: { in: ["ACTIVE", "ERROR"] }, scanFrequency: { not: "MANUAL" } } });
  const now = Date.now();
  for (const source of sources) {
    const last = source.lastScannedAt?.getTime() || 0;
    if (now - last >= dueMs(source.scanFrequency)) {
      await queue.add("scan-source", { sourceId: source.id }, { jobId: `scan-${source.id}-${Math.floor(now / dueMs(source.scanFrequency))}`, removeOnComplete: 200, removeOnFail: 200, attempts: 2, backoff: { type: "exponential", delay: 30000 } });
    }
  }
}

const worker = new Worker("applypilot-scans", async (job) => {
  if (job.name === "scan-source") return scanSource(job.data.sourceId);
}, { connection, concurrency: 2 });

worker.on("completed", (job) => console.log(`Completed ${job.id}`));
worker.on("failed", (job, error) => console.error(`Failed ${job?.id}`, error));

setInterval(() => enqueueDueSources().catch(console.error), 1000 * 60 * 5);
enqueueDueSources().catch(console.error);
console.log("ApplyPilot scan worker is running.");
