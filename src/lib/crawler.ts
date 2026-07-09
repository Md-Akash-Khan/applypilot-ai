import * as cheerio from "cheerio";
import got from "got";
import robotsParser from "robots-parser";
import { prisma } from "@/lib/db";
import { parseJobText } from "@/lib/parser";
import { computeRelevance } from "@/lib/relevance";

const userAgent = process.env.CRAWLER_USER_AGENT || "ApplyPilotAI/1.0";
const maxLinks = Number(process.env.CRAWLER_MAX_LINKS_PER_SOURCE || 30);

function normalizeUrl(url: string, base?: string) {
  try {
    return new URL(url, base).toString();
  } catch {
    return null;
  }
}

async function isAllowed(url: string) {
  if (process.env.RESPECT_ROBOTS_TXT === "false") return true;
  try {
    const parsed = new URL(url);
    const robotsUrl = `${parsed.origin}/robots.txt`;
    const body = await got(robotsUrl, { timeout: { request: 5000 }, headers: { "user-agent": userAgent } }).text();
    const robots = robotsParser(robotsUrl, body);
    return robots.isAllowed(url, userAgent) ?? true;
  } catch {
    return true;
  }
}

async function fetchHtml(url: string) {
  if (!(await isAllowed(url))) throw new Error(`Blocked by robots.txt: ${url}`);
  if (process.env.CRAWLER_FETCH_MODE === "playwright") {
    const { chromium } = await import("playwright");
    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage({ userAgent });
      await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
      return await page.content();
    } finally {
      await browser.close();
    }
  }

  return got(url, {
    timeout: { request: 20000 },
    headers: { "user-agent": userAgent, accept: "text/html,application/xhtml+xml" },
    retry: { limit: 1 }
  }).text();
}

function textFromHtml(html: string) {
  const $ = cheerio.load(html);
  $("script, style, noscript, svg").remove();
  return $("body").text().replace(/\s+/g, " ").trim();
}

function jsonLdJobs(html: string, sourceUrl: string) {
  const $ = cheerio.load(html);
  const jobs: Array<{ text: string; url: string }> = [];
  $('script[type="application/ld+json"]').each((_, node) => {
    const raw = $(node).text();
    try {
      const parsed = JSON.parse(raw);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items) {
        const nodes = item["@graph"] ? item["@graph"] : [item];
        for (const data of nodes) {
          if (data?.["@type"] === "JobPosting" || (Array.isArray(data?.["@type"]) && data["@type"].includes("JobPosting"))) {
            jobs.push({
              url: normalizeUrl(data.url || data.identifier?.value || sourceUrl, sourceUrl) || sourceUrl,
              text: [
                data.title,
                data.hiringOrganization?.name,
                data.jobLocation?.address?.addressLocality || data.jobLocation?.address?.addressCountry,
                data.employmentType,
                data.validThrough ? `Deadline: ${data.validThrough}` : "",
                data.description
              ].filter(Boolean).join("\n")
            });
          }
        }
      }
    } catch {
      // Ignore invalid structured data.
    }
  });
  return jobs;
}

function candidateLinks(html: string, sourceUrl: string) {
  const $ = cheerio.load(html);
  const seen = new Set<string>();
  const candidates: string[] = [];
  const keywordRegex = /job|career|opening|vacancy|position|apply|recruit|opportunit|faculty|lecturer|engineer|executive|intern|circular/i;

  $("a[href]").each((_, element) => {
    const href = $(element).attr("href");
    const label = $(element).text().trim();
    const absolute = href ? normalizeUrl(href, sourceUrl) : null;
    if (!absolute || seen.has(absolute)) return;
    if (keywordRegex.test(`${href} ${label}`)) {
      seen.add(absolute);
      candidates.push(absolute);
    }
  });

  return candidates.slice(0, maxLinks);
}

export async function scanSource(sourceId: string) {
  const source = await prisma.jobSource.findUnique({ where: { id: sourceId }, include: { user: { include: { settings: true } } } });
  if (!source) throw new Error("Source not found");
  if (source.status === "PAUSED") return { created: 0, skipped: 0 };

  const preferences = {
    keywords: source.keywords || source.user.settings?.roleKeywords,
    excludedKeywords: source.excludedKeywords || source.user.settings?.excludedKeywords,
    locationPreference: source.locationPreference || source.user.settings?.locations,
    jobTypes: source.jobTypes || source.user.settings?.preferredJobTypes
  };

  try {
    const html = await fetchHtml(source.url);
    const structuredJobs = jsonLdJobs(html, source.url);
    const links = candidateLinks(html, source.url);
    const texts: Array<{ text: string; url: string }> = [...structuredJobs];

    for (const url of links) {
      try {
        const jobHtml = await fetchHtml(url);
        const text = textFromHtml(jobHtml);
        if (text.length > 120) texts.push({ text, url });
      } catch (error) {
        console.warn(`Failed to fetch job detail ${url}`, error);
      }
    }

    if (!texts.length) {
      const pageText = textFromHtml(html);
      if (pageText.length > 120) texts.push({ text: pageText, url: source.url });
    }

    let created = 0;
    let skipped = 0;

    for (const item of texts) {
      const parsed = await parseJobText(item.text, preferences);
      const combinedText = `${parsed.title} ${parsed.company} ${parsed.description}`;
      if (computeRelevance(combinedText, preferences) < 20) {
        skipped += 1;
        continue;
      }

      const duplicate = await prisma.job.findFirst({
        where: {
          userId: source.userId,
          OR: [
            { sourceUrl: item.url },
            { title: parsed.title, company: parsed.company, location: parsed.location || undefined }
          ]
        }
      });

      if (duplicate) {
        skipped += 1;
        continue;
      }

      await prisma.job.create({
        data: {
          userId: source.userId,
          sourceId: source.id,
          title: parsed.title,
          company: parsed.company || source.name,
          location: parsed.location || null,
          deadline: parsed.deadlineDate,
          category: parsed.category,
          jobType: parsed.jobType || null,
          salary: parsed.salary || null,
          description: parsed.description || item.text.slice(0, 4500),
          requirements: parsed.requirements || null,
          applyUrl: parsed.applyUrl || item.url,
          sourceUrl: item.url,
          rawText: item.text.slice(0, 12000),
          relevanceScore: parsed.relevanceScore
        }
      });
      created += 1;
    }

    await prisma.jobSource.update({ where: { id: source.id }, data: { lastScannedAt: new Date(), lastError: null, status: "ACTIVE" } });
    await prisma.crawlerLog.create({ data: { sourceId: source.id, status: "SUCCESS", jobsFound: created, message: `${created} new, ${skipped} skipped` } });
    return { created, skipped };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown crawler error";
    await prisma.jobSource.update({ where: { id: source.id }, data: { lastScannedAt: new Date(), lastError: message, status: "ERROR" } });
    await prisma.crawlerLog.create({ data: { sourceId: source.id, status: "ERROR", jobsFound: 0, message } });
    throw error;
  }
}
