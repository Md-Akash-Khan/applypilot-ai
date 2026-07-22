const aliasGroups = [
  ["software", "developer", "programmer", "frontend", "backend", "full stack", "web", "mobile"],
  ["data", "analyst", "analytics", "business intelligence"],
  ["quality", "qa", "test", "tester", "sqa"],
  ["human resources", "hr", "people operations", "recruiter", "talent acquisition"],
  ["marketing", "growth", "digital marketing", "seo", "content"],
  ["sales", "business development", "account executive", "client acquisition"],
  ["customer success", "client success", "customer support", "support"],
  ["intern", "internship", "trainee", "graduate", "fresher"]
];

export function expandJobSearchTerms(query: string) {
  const normalized = query.toLowerCase().replace(/[^a-z0-9+#.\s-]/g, " ").replace(/\s+/g, " ").trim();
  if (!normalized) return [];

  const terms = new Set<string>([normalized]);
  for (const token of normalized.split(" ")) {
    if (token.length >= 2) terms.add(token);
  }
  for (const group of aliasGroups) {
    if (group.some((term) => normalized.includes(term))) group.forEach((term) => terms.add(term));
  }
  return [...terms].filter((term) => term.length >= 2).slice(0, 18);
}
