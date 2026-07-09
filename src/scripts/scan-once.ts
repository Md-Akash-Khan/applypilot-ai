import { prisma } from "@/lib/db";
import { scanSource } from "@/lib/crawler";

async function main() {
  const sources = await prisma.jobSource.findMany({ where: { status: { not: "PAUSED" } } });
  for (const source of sources) {
    console.log(`Scanning ${source.name}...`);
    try {
      const result = await scanSource(source.id);
      console.log(source.name, result);
    } catch (error) {
      console.error(source.name, error);
    }
  }
}

main().finally(() => prisma.$disconnect());
