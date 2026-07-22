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

function cleanRichText(value?: string | null) {
  if (!value) return null;
  const result = value
    .replace(/\r/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/[\t ]*[•●▪◦][\t ]*/g, "\n• ")
    .replace(/(^|\n)[\t ]*[-*][\t ]+/g, "$1• ")
    .split("\n")
    .map((line) => line.replace(/[\t ]+/g, " ").trim())
    .filter(Boolean)
    .filter((line, index, lines) => index === 0 || line.toLowerCase() !== lines[index - 1].toLowerCase())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
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

function looksLikeSalary(value?: string | null) {
  if (!value) return false;
  return /(?:৳|\$|€|£|₹|\b(?:tk\.?|taka|bdt|usd|eur|gbp|inr)\b|\d[\d,.]*\s*(?:to|[-–—])\s*(?:৳|\$|€|£|₹)?\s*\d)/i.test(value);
}

function extractSalary(raw: string) {
  const labels = ["salary range", "monthly salary", "salary", "compensation", "remuneration", "pay range"];
  const labelled = findLabelValue(raw, labels);
  if (looksLikeSalary(labelled)) return labelled;

  // Many job boards omit a colon, for example:
  // "Monthly Salary 35,000 Taka to 50,000 Taka based on competencies".
  // Keep this line-based so a heading such as "Compensation & Other Benefits"
  // cannot accidentally consume text from the next section.
  const salaryLine = linesOf(raw)
    .map((line) => line.match(/^(?:monthly\s+salary|salary\s+range|salary|remuneration|pay\s+range)\s*(?::|[-–—])?\s+(.+)$/i)?.[1])
    .find((value) => looksLikeSalary(value));

  return cleanValue(salaryLine);
}

export function parseDeadline(value?: string | null): Date | null {
  if (!value) return null;
  const match = value.match(new RegExp(datePattern, "i"));
  const normalized = (match?.[0] || value)
    .replace(/(\d)(st|nd|rd|th)/gi, "$1")
    .replace(/,/g, "")
    .trim();

  const isoDateOnly = normalized.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (isoDateOnly) {
    const [, year, month, day] = isoDateOnly;
    const parsed = new Date(Number(year), Number(month) - 1, Number(day), 12, 0, 0, 0);
    if (isValid(parsed)) return parsed;
  }

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
    if (isValid(parsed)) {
      parsed.setHours(12, 0, 0, 0);
      return parsed;
    }
  }

  const direct = new Date(normalized);
  if (!Number.isNaN(direct.getTime())) return direct;
  return null;
}

function extractDeadline(raw: string) {
  const labelled = raw.match(new RegExp(`(?:application\\s+deadline|deadline|apply\\s+by|closing\\s+date|last\\s+date|valid\\s+through)\\s*[:\\-–]?\\s*(${datePattern})`, "i"));
  if (labelled?.[1]) return cleanValue(labelled[1]);

  const standalone = raw.match(new RegExp(`\\b(${datePattern})\\b`, "i"));
  return cleanValue(standalone?.[1]);
}

const roleSignal = /\b(engineer|developer|programmer|analyst|specialist|executive|assistant|manager|officer|designer|architect|consultant|coordinator|administrator|accountant|auditor|intern|trainee|associate|lead|head|director|researcher|lecturer|professor|recruiter|sales|marketing|support|operations|product|project|quality|finance|hr|human resources)\b/i;

function plausibleJobTitle(value?: string | null) {
  const title = cleanValue(value);
  if (!title || title.length < 4 || title.length > 150) return false;
  if (/\b(logo|image|banner|thumbnail|apply now|career page|job circular|vacancy announcement)\b/i.test(title)) return false;
  if (/^(fresher|freshers|full[- ]?time|part[- ]?time|internship|remote|hybrid|on[- ]?site|not listed|unknown)$/i.test(title)) return false;
  if (/^(wellcome|welcome|about us|what we do|our products?|why us|home|careers?|jobs?|openings?)$/i.test(title)) return false;
  if (/\b(is|are)\s+(?:a|an|the|looking|seeking|hiring)\b/i.test(title) || /[.!?]$/.test(title)) return false;
  return roleSignal.test(title);
}

function titleScore(value: string) {
  let score = 0;
  const matches = value.match(new RegExp(roleSignal.source, "gi"))?.length || 0;
  score += Math.min(matches, 3) * 4;
  if (/\b(software|data|business|technical|development|engineering|technology|customer|client)\b/i.test(value)) score += 2;
  if (value.length <= 90) score += 1;
  if (/\b(logo|apply|company|deadline|salary|overview|requirement)\b/i.test(value)) score -= 8;
  return score;
}

function likelyTitle(raw: string, hint?: string | null) {
  const hinted = cleanValue(hint);
  if (plausibleJobTitle(hinted)) return hinted as string;

  const explicit = findLabelValue(raw, ["job title", "position title", "position", "role", "vacancy"]);
  if (plausibleJobTitle(explicit)) return explicit as string;

  const ignored = /^(apply|apply for this job|job vacancy announcement|overview|description|requirements?|qualifications?|responsibilities?|job details?|career opportunities?|jobs? at|view \d+ openings?)/i;
  const candidate = linesOf(raw)
    .slice(0, 80)
    .filter((line) => {
      if (/^https?:/i.test(line) || line.includes("@") || ignored.test(line)) return false;
      if (/^(deadline|type|timing|location|salary|position)\s*:/i.test(line)) return false;
      return plausibleJobTitle(line);
    })
    .sort((a, b) => titleScore(b) - titleScore(a))[0];

  return candidate || hinted || "Untitled Job";
}

function plausibleCompany(value?: string | null) {
  const company = cleanValue(value);
  if (!company || company.length < 2 || company.length > 100) return false;
  if (/\b(logo|unknown company|career page|job circular)\b/i.test(company)) return false;
  if (/^(as |we |our |you |the role|this role|join us)/i.test(company)) return false;
  if (/\b(we|you)\s+(?:are|will|can|should)\b/i.test(company)) return false;
  if (/\b(?:is|are)\s+(?:looking|seeking|hiring|a technology|an? software)\b/i.test(company)) return false;
  return !/[.!?]$/.test(company);
}

function extractCompany(raw: string, hint?: string | null) {
  const fromHint = cleanValue(hint);
  if (plausibleCompany(fromHint)) return fromHint as string;

  const explicit = findLabelValue(raw, ["company", "organization", "organisation", "employer", "institution", "institute"]);
  if (plausibleCompany(explicit)) return explicit as string;

  const patterns = [
    /(?:^|\n)([A-Z][A-Za-z0-9&.,'()\- ]{1,80}?)\s+is\s+(?:an?|the)\s+(?:technology[- ]driven|software development|technology|IT|digital|engineering|consulting|healthcare)\b/i,
    /(?:overview\s*:\s*)?([A-Z][A-Za-z0-9&.,'()\- ]{2,90}?)\s+(?:is|are)\s+(?:looking|seeking|hiring|inviting|recruiting)\b/,
    /(?:join|work at|career at)\s+([A-Z][A-Za-z0-9&.,'()\- ]{2,80})(?:\.|,|\n)/i,
    /\bat\s+([A-Z][A-Za-z0-9&.,'()\- ]{2,70})(?:\.|,|\n|\s+as\b)/
  ];

  for (const pattern of patterns) {
    const match = raw.match(pattern)?.[1];
    if (plausibleCompany(match)) return cleanValue(match) as string;
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
  return cleanRichText(result.join("\n"));
}

function conciseDescription(raw: string, title: string, company: string) {
  const overview = sectionBetween(
    raw,
    [/^overview\b/i, /^about (?:the )?role\b/i, /^job summary\b/i, /^description\b/i],
    [/^responsibilit/i, /^requirement/i, /^qualification/i, /^timeline/i, /^eligibility/i, /^general information/i, /^no\.? of vacancies?/i, /^job highlight/i, /^apply\b/i, /^benefit/i, /^compensation/i]
  );

  if (overview) return overview.slice(0, 900);

  const sentences = raw
    .split(/(?<=[.!?])\s+|\n+/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 35 && part.length <= 360)
    .filter((part) => !/^(apply|deadline|location|job type|employment type|salary|job vacancy announcement)/i.test(part));

  return (cleanRichText(sentences.slice(0, 3).join(" ")) || `${title} opportunity at ${company}.`).slice(0, 900);
}

function extractRequirements(raw: string) {
  const requirements = sectionBetween(
    raw,
    [/^essential requirements?\b/i, /^requirements?\b/i, /^qualifications?\b/i, /^eligibility\b/i, /^what we are looking for\b/i, /^expected knowledge/i, /^educational requirements?/i, /^experience requirements?/i],
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
  const salary = extractSalary(raw);
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
          content: "Extract one job posting into structured fields. The title must be the actual role name, never a logo/image label, company name, or seniority label such as Fresher. The company must be an organization name, never a sentence fragment. Write complete, clean sentences in the description and keep requirements as separate concise items. Keep description under 900 characters and requirements under 1400 characters. Preserve any listed salary. Never invent missing facts. Prefer provided hints only when they are reliable."
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

    const aiTitle = cleanValue(ai.title);
    const title = plausibleJobTitle(aiTitle) ? aiTitle as string : fallback.title;
    const aiCompany = cleanValue(ai.company);
    const company = plausibleCompany(aiCompany) ? aiCompany as string : fallback.company;
    const location = cleanValue(ai.location) || fallback.location;
    const deadline = cleanValue(ai.deadline) || fallback.deadline;
    const jobType = cleanValue(ai.jobType) || fallback.jobType;
    const aiDescription = cleanRichText(ai.description);
    const description = aiDescription && !/(^|\n)(?:are|is|and|or|but)\b/.test(aiDescription) ? aiDescription : fallback.description;
    const requirements = cleanRichText(ai.requirements) || fallback.requirements;
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
