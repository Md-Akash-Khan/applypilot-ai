import { z } from "zod";
import { isValid, parse } from "date-fns";
import { classifyJob } from "@/lib/classifier";
import { computeRelevance, type PreferenceInput } from "@/lib/relevance";

export const parsedJobSchema = z.object({
  title: z.string().min(1),
  company: z.string().default("Unknown Company"),
  location: z.string().nullable().optional(),
  deadline: z.string().nullable().optional(),
  jobType: z.string().nullable().optional(),
  salary: z.string().nullable().optional(),
  description: z.string().default(""),
  requirements: z.string().nullable().optional(),
  applyUrl: z.string().nullable().optional()
});

export type JobParseHints = {
  title?: string | null;
  company?: string | null;
  location?: string | null;
  jobType?: string | null;
  applyUrl?: string | null;
};

export type ParsedJob = z.infer<typeof parsedJobSchema> & {
  category: ReturnType<typeof classifyJob>;
  relevanceScore: number;
  deadlineDate: Date | null;
};

const monthPattern = "(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)";
const datePattern = `(?:${monthPattern}\\s+\\d{1,2}(?:st|nd|rd|th)?[,]?\\s+\\d{4}|\\d{1,2}(?:st|nd|rd|th)?\\s+${monthPattern}[,]?\\s+\\d{4}|\\d{4}[-/.]\\d{1,2}[-/.]\\d{1,2}|\\d{1,2}[-/.]\\d{1,2}[-/.]\\d{2,4})`;

function clean(input: string) {
  return input
    .replace(/\r/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/[\t ]+/g, " ")
    .replace(/ *\| */g, " | ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function cleanValue(value?: string | null) {
  const result = value?.replace(/\s+/g, " ").replace(/^[\s:|–—-]+|[\s|–—-]+$/g, "").trim();
  return result || null;
}

function linesOf(raw: string) {
  return raw.split(/\n|\s+\|\s+/).map((line) => line.trim()).filter(Boolean);
}

function validHttpUrl(value?: string | null) {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function firstUrl(text: string) {
  const labelled = text.match(/(?:apply(?: at| here| link)?|application(?: link| url)?|job link|source)\s*[:\-–]?\s*(https?:\/\/[^\s)<>]+)/i)?.[1];
  const raw = labelled || text.match(/https?:\/\/[^\s)<>]+/i)?.[0];
  return validHttpUrl(raw?.replace(/[.,;]+$/, ""));
}

function findLabelValue(raw: string, labels: string[]) {
  const escaped = labels.map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const lineRegex = new RegExp(`(?:^|\\n|\\|)\\s*(?:${escaped})\\s*[:\\-–]\\s*([^\\n|]+)`, "i");
  return cleanValue(raw.match(lineRegex)?.[1]);
}

export function parseDeadline(value?: string | null): Date | null {
  if (!value) return null;
  const match = value.match(new RegExp(datePattern, "i"));
  const normalized = (match?.[0] || value)
    .replace(/(\d)(st|nd|rd|th)/gi, "$1")
    .replace(/,/g, "")
    .trim();

  const direct = new Date(normalized);
  if (!Number.isNaN(direct.getTime())) return direct;

  const formats = [
    "yyyy-MM-dd",
    "yyyy/MM/dd",
    "dd/MM/yyyy",
    "MM/dd/yyyy",
    "dd-MM-yyyy",
    "MM-dd-yyyy",
    "d MMM yyyy",
    "d MMMM yyyy",
    "MMMM d yyyy",
    "MMM d yyyy"
  ];

  for (const format of formats) {
    const parsed = parse(normalized, format, new Date());
    if (isValid(parsed)) return parsed;
  }
  return null;
}

function extractDeadline(raw: string) {
  const labelled = raw.match(new RegExp(`(?:application\\s+deadline|deadline|apply\\s+by|closing\\s+date|last\\s+date|valid\\s+through)\\s*[:\\-–]?\\s*(${datePattern})`, "i"));
  if (labelled?.[1]) return cleanValue(labelled[1]);

  const standalone = raw.match(new RegExp(`\\b(${datePattern})\\b`, "i"));
  return cleanValue(standalone?.[1]);
}

function likelyTitle(raw: string, hint?: string | null) {
  if (cleanValue(hint)) return cleanValue(hint) as string;

  const explicit = findLabelValue(raw, ["job title", "position title", "position", "role", "vacancy"]);
  if (explicit && explicit.length <= 150) return explicit;

  const ignored = /^(apply|apply for this job|job vacancy announcement|overview|description|requirements?|qualifications?|responsibilities?|job details?|career opportunities?|jobs? at|view \d+ openings?)/i;
  const candidate = linesOf(raw).find((line) => {
    if (line.length < 4 || line.length > 150) return false;
    if (/^https?:/i.test(line) || line.includes("@") || ignored.test(line)) return false;
    if (/^(deadline|type|timing|location|salary)\s*:/i.test(line)) return false;
    return /[A-Za-z]/.test(line);
  });

  return candidate || "Untitled Job";
}

function extractCompany(raw: string, hint?: string | null) {
  const fromHint = cleanValue(hint);
  if (fromHint && !/^(unknown|company|career page)/i.test(fromHint)) return fromHint;

  const explicit = findLabelValue(raw, ["company", "organization", "organisation", "employer", "institution", "institute"]);
  if (explicit) return explicit;

  const patterns = [
    /(?:overview\s*:\s*)?([A-Z][A-Za-z0-9&.,'()\- ]{2,90}?)\s+(?:is|are)\s+(?:looking|seeking|hiring|inviting|recruiting)\b/,
    /(?:join|work at|career at)\s+([A-Z][A-Za-z0-9&.,'()\- ]{2,80})(?:\.|,|\n)/i,
    /\bat\s+([A-Z][A-Za-z0-9&.,'()\- ]{2,70})(?:\.|,|\n|\s+as\b)/
  ];

  for (const pattern of patterns) {
    const match = raw.match(pattern)?.[1];
    if (match) return cleanValue(match) || "Unknown Company";
  }

  return "Unknown Company";
}

function extractLocation(raw: string, hint?: string | null) {
  const explicit = cleanValue(hint) || findLabelValue(raw, ["job location", "location", "work location", "workplace", "office location"]);
  if (explicit) return explicit;

  const titleLineLocation = raw.match(/\n([^\n|]{2,80})\s*\|\s*(?:full[- ]?time|part[- ]?time|contract|internship|remote|hybrid)/i)?.[1];
  if (titleLineLocation) return cleanValue(titleLineLocation);

  const common = raw.match(/\b(?:Banani,?\s*Dhaka|Dhaka(?:,\s*Bangladesh|,\s*Dhaka Division)?|Chattogram|Chittagong|Sylhet|Rajshahi|Khulna|Barishal|Rangpur|Mymensingh|Remote|Hybrid)\b/i)?.[0];
  return cleanValue(common);
}

function normalizeJobType(value?: string | null) {
  const normalized = cleanValue(value);
  if (!normalized) return null;
  return normalized
    .replace(/\bfull[ -]?time\b/gi, "Full-time")
    .replace(/\bpart[ -]?time\b/gi, "Part-time")
    .replace(/\bon[ -]?site\b/gi, "On-site")
    .replace(/\bpartially remote\b/gi, "Partially remote")
    .replace(/\binternship\b/gi, "Internship")
    .replace(/\bcontract(?:ual)?\b/gi, "Contract")
    .replace(/\btemporary\b/gi, "Temporary")
    .replace(/\bfreelance\b/gi, "Freelance")
    .replace(/\bremote\b/gi, "Remote")
    .replace(/\bhybrid\b/gi, "Hybrid");
}

function extractJobType(raw: string, hint?: string | null) {
  const explicit = normalizeJobType(hint) || normalizeJobType(findLabelValue(raw, ["employment type", "job type", "type", "work type"]));
  if (explicit) return explicit;

  const matches = raw.match(/\b(full[- ]?time|part[- ]?time|internship|contract(?:ual)?|temporary|freelance|partially remote|remote|hybrid|on[- ]?site)\b/gi);
  if (!matches?.length) return null;
  return [...new Set(matches.map((item) => normalizeJobType(item)).filter(Boolean))].slice(0, 2).join(" | ");
}

function sectionBetween(raw: string, starts: RegExp[], stops: RegExp[]) {
  const lines = raw.split("\n").map((line) => line.trim()).filter(Boolean);
  const startIndex = lines.findIndex((line) => starts.some((pattern) => pattern.test(line)));
  if (startIndex === -1) return null;

  const result: string[] = [];
  const inlineValue = lines[startIndex].replace(/^[^:]{1,70}:\s*/, "").trim();
  if (inlineValue && inlineValue !== lines[startIndex]) result.push(inlineValue);

  for (let index = startIndex + 1; index < lines.length; index += 1) {
    if (stops.some((pattern) => pattern.test(lines[index]))) break;
    result.push(lines[index]);
    if (result.join(" ").length > 1600) break;
  }
  return cleanValue(result.join("\n"));
}

function conciseDescription(raw: string, title: string, company: string) {
  const overview = sectionBetween(
    raw,
    [/^overview\b/i, /^about (?:the )?role\b/i, /^job summary\b/i, /^description\b/i],
    [/^responsibilit/i, /^requirement/i, /^qualification/i, /^no\.? of vacancies?/i, /^job highlight/i, /^apply\b/i, /^benefit/i]
  );

  if (overview) return overview.slice(0, 900);

  const sentences = raw
    .replace(title, "")
    .replace(company, "")
    .split(/(?<=[.!?])\s+|\n+/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 35 && part.length <= 360)
    .filter((part) => !/^(apply|deadline|location|job type|employment type|salary|job vacancy announcement)/i.test(part));

  return (sentences.slice(0, 3).join(" ") || `${title} opportunity at ${company}.`).slice(0, 900);
}

function extractRequirements(raw: string) {
  const requirements = sectionBetween(
    raw,
    [/^requirements?\b/i, /^qualifications?\b/i, /^eligibility\b/i, /^what we are looking for\b/i, /^expected knowledge/i, /^educational requirements?/i, /^experience requirements?/i],
    [/^responsibilit/i, /^benefit/i, /^compensation/i, /^apply\b/i, /^application process/i, /^about (?:the )?company/i]
  );
  return requirements?.slice(0, 1400) || null;
}

function fallbackParse(rawInput: string, preferences?: PreferenceInput, hints: JobParseHints = {}): ParsedJob {
  const raw = clean(rawInput);
  const title = likelyTitle(raw, hints.title);
  const company = extractCompany(raw, hints.company);
  const deadline = extractDeadline(raw);
  const location = extractLocation(raw, hints.location);
  const jobType = extractJobType(raw, hints.jobType);
  const salary = findLabelValue(raw, ["salary", "compensation", "remuneration", "pay range"]);
  const applyUrl = validHttpUrl(hints.applyUrl) || firstUrl(raw);
  const description = conciseDescription(raw, title, company);
  const requirements = extractRequirements(raw);
  const classificationText = `${title}\n${company}\n${raw.slice(0, 420)}`;
  const scoringText = `${title}\n${company}\n${location || ""}\n${jobType || ""}\n${description}\n${requirements || ""}`;

  return {
    title,
    company,
    location,
    deadline,
    deadlineDate: parseDeadline(deadline),
    jobType,
    salary,
    description,
    requirements,
    applyUrl,
    category: classifyJob(classificationText),
    relevanceScore: computeRelevance(scoringText, preferences)
  };
}

function responseText(data: any) {
  if (typeof data?.output_text === "string") return data.output_text;
  return (data?.output || [])
    .flatMap((item: any) => item?.content || [])
    .map((content: any) => content?.text || "")
    .join("\n")
    .trim();
}

async function parseWithOpenAI(rawInput: string, hints: JobParseHints): Promise<z.infer<typeof parsedJobSchema> | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.OPENAI_MODEL || "gpt-5.6-luna";
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "system",
          content: "Extract one job posting into structured fields. Keep description concise (maximum 900 characters) and requirements concise (maximum 1400 characters). Never invent missing facts. Prefer the provided hints when they are reliable."
        },
        {
          role: "user",
          content: `HINTS:\n${JSON.stringify(hints)}\n\nJOB TEXT:\n${rawInput.slice(0, 14000)}`
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "job_posting",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              title: { type: "string" },
              company: { type: "string" },
              location: { type: ["string", "null"] },
              deadline: { type: ["string", "null"] },
              jobType: { type: ["string", "null"] },
              salary: { type: ["string", "null"] },
              description: { type: "string" },
              requirements: { type: ["string", "null"] },
              applyUrl: { type: ["string", "null"] }
            },
            required: ["title", "company", "location", "deadline", "jobType", "salary", "description", "requirements", "applyUrl"]
          }
        }
      }
    })
  });

  if (!response.ok) return null;
  const data = await response.json();
  const text = responseText(data);
  if (!text) return null;
  return parsedJobSchema.parse(JSON.parse(text));
}

export async function parseJobText(rawInput: string, preferences?: PreferenceInput, hints: JobParseHints = {}): Promise<ParsedJob> {
  const raw = clean(rawInput);
  const fallback = fallbackParse(raw, preferences, hints);

  try {
    const ai = await parseWithOpenAI(raw, hints);
    if (!ai) return fallback;

    const title = cleanValue(ai.title) || fallback.title;
    const company = !/^unknown company$/i.test(ai.company) ? cleanValue(ai.company) || fallback.company : fallback.company;
    const location = cleanValue(ai.location) || fallback.location;
    const deadline = cleanValue(ai.deadline) || fallback.deadline;
    const jobType = cleanValue(ai.jobType) || fallback.jobType;
    const description = cleanValue(ai.description) || fallback.description;
    const requirements = cleanValue(ai.requirements) || fallback.requirements;
    const applyUrl = validHttpUrl(ai.applyUrl) || fallback.applyUrl;
    const classificationText = `${title}\n${company}\n${raw.slice(0, 420)}`;
    const scoringText = `${title}\n${company}\n${location || ""}\n${jobType || ""}\n${description}\n${requirements || ""}`;

    return {
      title,
      company,
      location,
      deadline,
      deadlineDate: parseDeadline(deadline),
      jobType,
      salary: cleanValue(ai.salary) || fallback.salary,
      description: description.slice(0, 900),
      requirements: requirements?.slice(0, 1400) || null,
      applyUrl,
      category: classifyJob(classificationText),
      relevanceScore: computeRelevance(scoringText, preferences)
    };
  } catch (error) {
    console.warn("AI parse failed, using deterministic parser", error);
    return fallback;
  }
}
