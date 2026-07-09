import { z } from "zod";
import { parse, isValid } from "date-fns";
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

export type ParsedJob = z.infer<typeof parsedJobSchema> & {
  category: ReturnType<typeof classifyJob>;
  relevanceScore: number;
  deadlineDate: Date | null;
};

function clean(input: string) {
  return input.replace(/\u00a0/g, " ").replace(/[\t ]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

function firstUrl(text: string) {
  return text.match(/https?:\/\/[^\s)]+/i)?.[0]?.replace(/[.,;]$/, "") || null;
}

function findLine(raw: string, labels: string[]) {
  const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  for (const label of labels) {
    const regex = new RegExp(`^${label}\\s*[:\\-–]\\s*(.+)$`, "i");
    const line = lines.find((item) => regex.test(item));
    if (line) return line.replace(regex, "$1").trim();
  }
  return null;
}

function parseDeadline(value?: string | null): Date | null {
  if (!value) return null;
  const normalized = value.replace(/(deadline|apply by|closing date|last date|valid through)\s*[:\-–]?/i, "").trim();
  const direct = new Date(normalized);
  if (!Number.isNaN(direct.getTime())) return direct;

  const formats = ["dd/MM/yyyy", "dd-MM-yyyy", "d MMM yyyy", "d MMMM yyyy", "MMMM d, yyyy", "MMM d, yyyy"];
  for (const format of formats) {
    const parsed = parse(normalized, format, new Date());
    if (isValid(parsed)) return parsed;
  }
  return null;
}

function extractDeadline(raw: string) {
  const label = findLine(raw, ["deadline", "apply by", "closing date", "last date", "application deadline", "valid through"]);
  if (label) return label;
  const match = raw.match(/(?:deadline|apply by|closing date|last date|application deadline)\s*[:\-–]?\s*([^\n.]{4,80})/i);
  return match?.[1]?.trim() || null;
}

function likelyTitle(raw: string) {
  const explicit = findLine(raw, ["job title", "position", "role", "title"]);
  if (explicit) return explicit;
  const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const candidate = lines.find((line) => line.length >= 4 && line.length <= 110 && !/^https?:/i.test(line) && !line.includes("@"));
  return candidate || "Untitled Job";
}

function fallbackParse(rawInput: string, preferences?: PreferenceInput): ParsedJob {
  const raw = clean(rawInput);
  const deadline = extractDeadline(raw);
  const title = likelyTitle(raw);
  const company = findLine(raw, ["company", "organization", "employer", "institute"]) || raw.match(/\bat\s+([A-Z][A-Za-z0-9 .,&-]{2,60})/)?.[1]?.trim() || "Unknown Company";
  const location = findLine(raw, ["location", "job location", "workplace", "office"]) || raw.match(/\b(Dhaka|Remote|Hybrid|Chittagong|Sylhet|Rajshahi|Khulna|Barisal|Rangpur|Mymensingh|USA|Germany|Canada|Australia|UK)\b/i)?.[0] || null;
  const jobType = findLine(raw, ["job type", "employment type", "type"]) || raw.match(/\b(full[- ]time|part[- ]time|contract|internship|temporary|remote|hybrid)\b/i)?.[0] || null;
  const salary = findLine(raw, ["salary", "compensation", "remuneration"]);
  const applyUrl = firstUrl(raw);
  const category = classifyJob(`${title}\n${company}\n${raw}`);
  const relevanceScore = computeRelevance(raw, preferences);

  return {
    title,
    company,
    location,
    deadline,
    deadlineDate: parseDeadline(deadline),
    jobType,
    salary,
    description: raw.slice(0, 4500),
    requirements: findLine(raw, ["requirements", "qualification", "qualifications", "eligibility"]),
    applyUrl,
    category,
    relevanceScore
  };
}

function extractJson(text: string) {
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) throw new Error("No JSON object found in AI response");
  return text.slice(first, last + 1);
}

async function parseWithOpenAI(rawInput: string): Promise<z.infer<typeof parsedJobSchema> | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.OPENAI_MODEL || "gpt-5.5-mini";
  const prompt = `Extract one job posting from the text below. Return only compact JSON with these keys: title, company, location, deadline, jobType, salary, description, requirements, applyUrl. If a field is missing, use null except title/company/description.\n\nJOB TEXT:\n${rawInput.slice(0, 12000)}`;

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      input: prompt,
      temperature: 0.1
    })
  });

  if (!response.ok) return null;
  const data = await response.json();
  const text = data.output_text || data.output?.flatMap((item: any) => item.content || []).map((content: any) => content.text || "").join("\n");
  if (!text) return null;
  const parsed = JSON.parse(extractJson(text));
  return parsedJobSchema.parse(parsed);
}

export async function parseJobText(rawInput: string, preferences?: PreferenceInput): Promise<ParsedJob> {
  const raw = clean(rawInput);
  try {
    const ai = await parseWithOpenAI(raw);
    if (ai) {
      const rawForScoring = `${ai.title}\n${ai.company}\n${ai.location || ""}\n${ai.jobType || ""}\n${ai.description || ""}\n${ai.requirements || ""}`;
      return {
        ...ai,
        deadlineDate: parseDeadline(ai.deadline),
        category: classifyJob(rawForScoring),
        relevanceScore: computeRelevance(rawForScoring, preferences)
      };
    }
  } catch (error) {
    console.warn("AI parse failed, falling back to heuristic parser", error);
  }

  return fallbackParse(raw, preferences);
}
