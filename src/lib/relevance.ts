import { parseJsonArray } from "@/lib/json";

export type PreferenceInput = {
  keywords?: string | null;
  excludedKeywords?: string | null;
  locationPreference?: string | null;
  jobTypes?: string | null;
};

export function computeRelevance(raw: string, preferences?: PreferenceInput) {
  const text = raw.toLowerCase();
  const keywords = parseJsonArray(preferences?.keywords).map((k) => k.toLowerCase());
  const excluded = parseJsonArray(preferences?.excludedKeywords).map((k) => k.toLowerCase());
  const locations = parseJsonArray(preferences?.locationPreference).map((k) => k.toLowerCase());
  const jobTypes = parseJsonArray(preferences?.jobTypes).map((k) => k.toLowerCase());

  let score = 35;
  const matchedKeywords = keywords.filter((keyword) => text.includes(keyword));
  const matchedLocations = locations.filter((keyword) => text.includes(keyword));
  const matchedTypes = jobTypes.filter((keyword) => text.includes(keyword));
  const blocked = excluded.filter((keyword) => text.includes(keyword));

  if (keywords.length) score += Math.min(30, matchedKeywords.length * 10);
  if (locations.length) score += Math.min(15, matchedLocations.length * 8);
  if (jobTypes.length) score += Math.min(10, matchedTypes.length * 5);
  if (/deadline|apply by|closing date|last date|valid through/i.test(raw)) score += 5;
  if (blocked.length) score -= Math.min(45, blocked.length * 20);

  return Math.max(0, Math.min(100, score));
}
