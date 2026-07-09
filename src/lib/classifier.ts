import type { JobCategory } from "@prisma/client";

const govtKeywords = [
  "government",
  "govt",
  "ministry",
  "directorate",
  "commission",
  "bcs",
  "public service",
  "পিএসসি",
  "সরকারি",
  "নিয়োগ বিজ্ঞপ্তি",
  "circular",
  "office of",
  "authority"
];

const academicKeywords = [
  "university",
  "lecturer",
  "assistant professor",
  "associate professor",
  "professor",
  "faculty",
  "research assistant",
  "postdoc",
  "phd",
  "lab manager",
  "teaching assistant",
  "academic",
  "institute",
  "department of"
];

export function classifyJob(input: string): JobCategory {
  const text = input.toLowerCase();
  const academicScore = academicKeywords.reduce((score, keyword) => score + (text.includes(keyword) ? 1 : 0), 0);
  const govtScore = govtKeywords.reduce((score, keyword) => score + (text.includes(keyword) ? 1 : 0), 0);

  if (academicScore >= 1 && academicScore >= govtScore) return "ACADEMIC_RESEARCH";
  if (govtScore >= 1) return "GOVERNMENT";
  if (text.length > 0) return "PRIVATE_CORPORATE";
  return "UNCATEGORIZED";
}

export function categoryLabel(category: JobCategory | string) {
  const map: Record<string, string> = {
    GOVERNMENT: "Government Job",
    PRIVATE_CORPORATE: "Private & Corporate",
    ACADEMIC_RESEARCH: "Academic & Research",
    UNCATEGORIZED: "Uncategorized"
  };
  return map[category] || category;
}
