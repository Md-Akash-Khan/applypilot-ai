import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.APP_SINGLE_USER_EMAIL || "owner@applypilot.local";
  const password = process.env.APP_SINGLE_USER_PASSWORD || "ApplyPilot#2026";
  const name = process.env.APP_SINGLE_USER_NAME || "ApplyPilot Owner";
  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: { name, passwordHash },
    create: {
      email,
      name,
      passwordHash,
      settings: {
        create: {
          roleKeywords: JSON.stringify(["software engineer", "data analyst", "research assistant", "executive"]),
          excludedKeywords: JSON.stringify(["unpaid"]),
          locations: JSON.stringify(["Dhaka", "Remote"]),
          preferredJobTypes: JSON.stringify(["Full-time", "Internship", "Contract"])
        }
      }
    },
    include: { settings: true }
  });

  await prisma.jobSource.upsert({
    where: { userId_url: { userId: user.id, url: "https://example.com/careers" } },
    update: {},
    create: {
      userId: user.id,
      name: "Example Career Page",
      url: "https://example.com/careers",
      keywords: JSON.stringify(["software", "engineer", "research", "executive"]),
      excludedKeywords: JSON.stringify(["unpaid"]),
      locationPreference: JSON.stringify(["remote", "dhaka"]),
      jobTypes: JSON.stringify(["full-time", "internship"]),
      scanFrequency: "MANUAL"
    }
  });

  await prisma.job.create({
    data: {
      userId: user.id,
      title: "AI Data Operations Executive",
      company: "ApplyPilot Sample Company",
      location: "Dhaka / Remote",
      deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
      category: "PRIVATE_CORPORATE",
      jobType: "Full-time",
      description: "Sample job created by the seed script so the dashboard has data on first run.",
      requirements: "Documentation, data validation, communication, spreadsheet management.",
      applyUrl: "https://example.com/apply",
      sourceUrl: "https://example.com/careers/ai-data-operations-executive",
      rawText: "AI Data Operations Executive, Dhaka / Remote, deadline next week.",
      relevanceScore: 84,
      status: "NEW"
    }
  }).catch(() => undefined);

  console.log(`Seed complete. Login email: ${email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
