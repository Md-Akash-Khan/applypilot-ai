import { parseJsonArray } from "@/lib/json";

export type PreferenceInput = {
  keywords?: string | null;
  excludedKeywords?: string | null;
  locationPreference?: string | null;
  jobTypes?: string | null;
};

function normalizedList(value?: string | null) {
  return parseJsonArray(value).map((item) => item.toLowerCase());
}

export function matchesPreferences(raw: string, preferences?: PreferenceInput) {
  const text = raw.toLowerCase();
  const keywords = normalizedList(preferences?.keywords);
  const excluded = normalizedList(preferences?.excludedKeywords);
  const locations = normalizedList(preferences?.locationPreference);
  const jobTypes = normalizedList(preferences?.jobTypes);

  if (excluded.some((keyword) => text.includes(keyword))) return false;
  if (keywords.length && !keywords.some((keyword) => text.includes(keyword))) return false;

  // Location and job type only block a result when the posting provides a
  // recognizable value. Missing metadata should not discard an otherwise
  // relevant role.
  const hasLocationSignal = /\b(location|remote|hybrid|onsite|on-site|dhaka|bangladesh|chattogram|sylhet|rajshahi|khulna|barishal|rangpur|mymensingh)\b/i.test(raw);
  if (locations.length && hasLocationSignal && !locations.some((location) => text.includes(location))) return false;

  const hasTypeSignal = /\b(full[- ]?time|part[- ]?time|internship|contract|temporary|freelance|remote|hybrid)\b/i.test(raw);
  if (jobTypes.length && hasTypeSignal && !jobTypes.some((jobType) => text.includes(jobType))) return false;

  return true;
}

/**
 * Kept as internal metadata for sorting and future recommendations. The score
 * is deliberately no longer shown in the user interface.
 */
export function computeRelevance(raw: string, preferences?: PreferenceInput) {
  const text = raw.toLowerCase();
  const keywords = normalizedList(preferences?.keywords);
  const excluded = normalizedList(preferences?.excludedKeywords);
  const locations = normalizedList(preferences?.locationPreference);
  const jobTypes = normalizedList(preferences?.jobTypes);

  let score = 50;
  score += Math.min(25, keywords.filter((keyword) => text.includes(keyword)).length * 9);
  score += Math.min(12, locations.filter((keyword) => text.includes(keyword)).length * 6);
  score += Math.min(8, jobTypes.filter((keyword) => text.includes(keyword)).length * 4);
  score -= Math.min(55, excluded.filter((keyword) => text.includes(keyword)).length * 30);
  if (/deadline|apply by|closing date|last date|valid through/i.test(raw)) score += 5;

  return Math.max(0, Math.min(100, score));
}
