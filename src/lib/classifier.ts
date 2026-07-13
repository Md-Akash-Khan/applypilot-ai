import type { JobCategory } from "@prisma/client";

const governmentRolePatterns = [
  /\bgovernment\b/i,
  /\bgovt\.?\b/i,
  /\bministry\b/i,
  /\bdirectorate\b/i,
  /\bpublic service commission\b/i,
  /\bbcs\b/i,
  /\bstate[- ]owned\b/i,
  /\bgovernment circular\b/i,
  /\bনিয়োগ বিজ্ঞপ্তি\b/i,
  /\bসরকারি\b/i
];

const academicRolePatterns = [
  /\blecturer\b/i,
  /\bassistant professor\b/i,
  /\bassociate professor\b/i,
  /\bprofessor\b/i,
  /\bfaculty(?: member)?\b/i,
  /\bresearch assistant\b/i,
  /\bresearch associate\b/i,
  /\bpost[- ]?doctoral\b/i,
  /\bpostdoc\b/i,
  /\bteaching assistant\b/i,
  /\blab(?:oratory)? manager\b/i,
  /\bphd (?:position|fellowship|candidate)\b/i,
  /\bacademic coordinator\b/i
];

const academicEmployerPatterns = [
  /\buniversity\b/i,
  /\bcollege\b/i,
  /\bacademy\b/i,
  /\bresearch institute\b/i,
  /\binstitute of technology\b/i
];

/**
 * Classification intentionally gives the title and employer more weight than
 * the requirements text. This prevents phrases such as “degree from a
 * university” from turning a normal corporate role into an academic job.
 */
export function classifyJob(input: string): JobCategory {
  const normalized = input.replace(/\s+/g, " ").trim();
  if (!normalized) return "UNCATEGORIZED";

  const firstSection = normalized.slice(0, 420);
  const academicRole = academicRolePatterns.some((pattern) => pattern.test(firstSection));
  const governmentRole = governmentRolePatterns.some((pattern) => pattern.test(firstSection));

  if (academicRole) return "ACADEMIC_RESEARCH";
  if (governmentRole) return "GOVERNMENT";

  const earlyAcademicEmployer = academicEmployerPatterns.some((pattern) => pattern.test(firstSection));
  const academicContext = /\b(department|faculty|campus|school of|research centre|research center)\b/i.test(firstSection);
  if (earlyAcademicEmployer && academicContext) return "ACADEMIC_RESEARCH";

  return "PRIVATE_CORPORATE";
}

export function categoryLabel(category: JobCategory | string) {
  const map: Record<string, string> = {
    GOVERNMENT: "Government",
    PRIVATE_CORPORATE: "Private & Corporate",
    ACADEMIC_RESEARCH: "Academic & Research",
    UNCATEGORIZED: "Uncategorized"
  };
  return map[category] || category;
}
