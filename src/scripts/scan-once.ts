import { prisma } from "@/lib/db";
import { scanSource } from "@/lib/crawler";
import { isSourceDue } from "@/lib/schedule";

async function main() {
  const startedAt = new Date();

  console.log(
    `ApplyPilot scheduled scan started at ${startedAt.toISOString()}`
  );

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

  let scanned = 0;
  let skipped = 0;
  let imported = 0;
  let failed = 0;

  for (const source of sources) {
    if (!isSourceDue(source, startedAt)) {
      skipped += 1;
      console.log(`[SKIPPED] ${source.name} is not due yet.`);
      continue;
    }

    scanned += 1;

    console.log(`[SCANNING] ${source.name} — ${source.url}`);

    try {
      const result = await scanSource(source.id);

      imported += result.created;

      console.log(
        `[SUCCESS] ${source.name}: ${result.discovered} discovered, ` +
          `${result.created} imported, ${result.skipped} skipped.`
      );
    } catch (error) {
      failed += 1;
      console.error(`[FAILED] ${source.name}:`, error);
    }
  }

  console.log(
    `Completed: ${scanned} scanned, ${skipped} not due, ` +
      `${imported} jobs imported, ${failed} failed.`
  );

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
