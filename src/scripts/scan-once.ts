import { prisma } from "@/lib/db";
import { scanSource } from "@/lib/crawler";

const HOUR_MS = 60 * 60 * 1000;

function frequencyMs(frequency: string): number {
  switch (frequency) {
    case "TWICE_DAILY":
      return 12 * HOUR_MS;

    case "DAILY":
      return 24 * HOUR_MS;

    case "WEEKLY":
      return 7 * 24 * HOUR_MS;

    default:
      return Number.POSITIVE_INFINITY;
  }
}

function isSourceDue(source: {
  scanFrequency: string;
  status: string;
  lastScannedAt: Date | null;
}): boolean {
  if (source.scanFrequency === "MANUAL") {
    return false;
  }

  if (!source.lastScannedAt) {
    return true;
  }

  const normalInterval = frequencyMs(source.scanFrequency);

  /*
   * Failed sources are retried after six hours instead of waiting
   * for the complete daily or weekly interval.
   */
  const requiredInterval =
    source.status === "ERROR"
      ? Math.min(normalInterval, 6 * HOUR_MS)
      : normalInterval;

  return Date.now() - source.lastScannedAt.getTime() >= requiredInterval;
}

async function main() {
  const startedAt = new Date();

  console.log("========================================");
  console.log("ApplyPilot scheduled scan started");
  console.log(`Started at: ${startedAt.toISOString()}`);
  console.log("========================================");

  const sources = await prisma.jobSource.findMany({
    where: {
      status: {
        in: ["ACTIVE", "ERROR"]
      },
      scanFrequency: {
        not: "MANUAL"
      }
    },
    orderBy: {
      createdAt: "asc"
    }
  });

  if (!sources.length) {
    console.log("No automatic sources were found.");
    console.log(
      "Add a source with Daily, Twice Daily, or Weekly frequency."
    );
    return;
  }

  let scanned = 0;
  let skipped = 0;
  let created = 0;
  let duplicatesOrIrrelevant = 0;
  let failed = 0;

  for (const source of sources) {
    if (!isSourceDue(source)) {
      skipped += 1;

      console.log(
        `[SKIPPED] ${source.name} — not due yet (${source.scanFrequency})`
      );

      continue;
    }

    scanned += 1;

    console.log("");
    console.log(`[SCANNING] ${source.name}`);
    console.log(`URL: ${source.url}`);

    try {
      const result = await scanSource(source.id);

      created += result.created;
      duplicatesOrIrrelevant += result.skipped;

      console.log(
        `[SUCCESS] ${source.name}: ${result.created} new, ${result.skipped} skipped`
      );
    } catch (error) {
      failed += 1;

      const message =
        error instanceof Error ? error.message : "Unknown crawler error";

      console.error(`[FAILED] ${source.name}: ${message}`);
    }
  }

  console.log("");
  console.log("========================================");
  console.log("ApplyPilot scheduled scan completed");
  console.log(`Sources found: ${sources.length}`);
  console.log(`Sources scanned: ${scanned}`);
  console.log(`Sources not due: ${skipped}`);
  console.log(`New jobs created: ${created}`);
  console.log(`Duplicate/irrelevant jobs skipped: ${duplicatesOrIrrelevant}`);
  console.log(`Failed sources: ${failed}`);
  console.log(`Finished at: ${new Date().toISOString()}`);
  console.log("========================================");

  /*
   * Mark the GitHub Action as failed when one or more sources fail.
   * Other sources are still scanned before the script exits.
   */
  if (failed > 0) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error("Scheduled scan crashed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
