import * as cheerio from "cheerio";
import got from "got";
import robotsParser from "robots-parser";
import { prisma } from "@/lib/db";
import { parseJobText, type JobParseHints } from "@/lib/parser";
import { computeRelevance, matchesPreferences } from "@/lib/relevance";
import { parseJsonArray } from "@/lib/json";

const userAgent = process.env.CRAWLER_USER_AGENT || "ApplyPilotAI/2.0";
const maxLinks = Math.max(5, Number(process.env.CRAWLER_MAX_LINKS_PER_SOURCE || 40));

export type DiscoveredJob = {
  title?: string | null;
  company?: string | null;
  location?: string | null;
  jobType?: string | null;
  url: string;
  summary: string;
  structuredText?: string;
};

function normalizeWhitespace(value: string) {
  return value.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function canonicalUrl(url: string, base?: string) {
  try {
    const parsed = new URL(url, base);
    if (!["http:", "https:"].includes(parsed.protocol)) return null;
    parsed.hash = "";
    for (const key of [...parsed.searchParams.keys()]) {
      if (/^(utm_|fbclid|gclid|ref$|source$)/i.test(key)) parsed.searchParams.delete(key);
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

function samePage(first: string, second: string) {
  const a = canonicalUrl(first);
  const b = canonicalUrl(second);
  return Boolean(a && b && a === b);
}

async function isAllowed(url: string) {
  if (process.env.RESPECT_ROBOTS_TXT === "false") return true;
  try {
    const parsed = new URL(url);
    const robotsUrl = `${parsed.origin}/robots.txt`;
    const body = await got(robotsUrl, {
      timeout: { request: 5000 },
      headers: { "user-agent": userAgent },
      retry: { limit: 0 }
    }).text();
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
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 35000 });
      await page.waitForTimeout(1200);
      return await page.content();
    } finally {
      await browser.close();
    }
  }

  return got(url, {
    timeout: { request: 25000 },
    headers: {
      "user-agent": userAgent,
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
    },
    retry: { limit: 1 },
    followRedirect: true
  }).text();
}

function cleanDocument(html: string) {
  const $ = cheerio.load(html);
  $("script, style, noscript, svg, canvas, iframe, nav, footer, form, [aria-hidden='true']").remove();
  $("br").replaceWith("\n");
  $("p, li, h1, h2, h3, h4, h5, h6, section, article").each((_, node) => {
    $(node).prepend("\n").append("\n");
  });
  return $;
}

function textFromHtml(html: string) {
  const $ = cleanDocument(html);
  const selectors = [
    "main",
    "article",
    "[role='main']",
    "[class*='job-description']",
    "[class*='job_details']",
    "[class*='job-details']",
    "[class*='description']",
    "#content",
    "body"
  ];

  let best = "";
  for (const selector of selectors) {
    $(selector).each((_, node) => {
      const text = $(node).text().replace(/\r/g, "").replace(/[\t ]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
      if (text.length > best.length && text.length < 30000) best = text;
    });
    if (best.length > 500 && selector !== "body") break;
  }
  return best || normalizeWhitespace($("body").text());
}

function htmlToText(fragment: string) {
  const $ = cheerio.load(fragment || "");
  $("script, style, noscript, svg").remove();
  return $("body").text().replace(/[\t ]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

function metadataCompany(html: string) {
  const $ = cheerio.load(html);
  const candidates = [
    $("meta[property='og:site_name']").attr("content"),
    $("h1").first().text(),
    $("title").text()
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    const cleaned = normalizeWhitespace(candidate)
      .replace(/^(jobs?|careers?|openings?)\s+(?:at|with)\s+/i, "")
      .replace(/\s+[|–—-]\s+(jobs?|careers?|openings?).*$/i, "")
      .replace(/\s+(jobs?|openings?|careers?)$/i, "")
      .trim();
    if (cleaned.length >= 2 && cleaned.length <= 100) return cleaned;
  }
  return null;
}

function flattenJsonLd(value: unknown): any[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.flatMap(flattenJsonLd);
  if (typeof value !== "object") return [];
  const object = value as Record<string, unknown>;
  const children = [object, ...flattenJsonLd(object["@graph"]), ...flattenJsonLd(object.itemListElement)];
  return children;
}

function locationFromJsonLd(jobLocation: any) {
  const location = Array.isArray(jobLocation) ? jobLocation[0] : jobLocation;
  const address = location?.address || location;
  return [address?.addressLocality, address?.addressRegion, address?.addressCountry].filter(Boolean).join(", ") || null;
}

function jsonLdJobs(html: string, sourceUrl: string, fallbackCompany?: string | null): DiscoveredJob[] {
  const $ = cheerio.load(html);
  const jobs: DiscoveredJob[] = [];

  $('script[type="application/ld+json"]').each((_, node) => {
    try {
      const parsed = JSON.parse($(node).text());
      for (const data of flattenJsonLd(parsed)) {
        const types = Array.isArray(data?.["@type"]) ? data["@type"] : [data?.["@type"]];
        if (!types.includes("JobPosting")) continue;

        const url = canonicalUrl(data.url || data.mainEntityOfPage || data.identifier?.value || sourceUrl, sourceUrl) || sourceUrl;
        const description = htmlToText(data.description || "");
        const company = data.hiringOrganization?.name || fallbackCompany || null;
        const location = locationFromJsonLd(data.jobLocation);
        const jobType = Array.isArray(data.employmentType) ? data.employmentType.join(" | ") : data.employmentType || null;
        const structuredText = [
          data.title ? `Job Title: ${data.title}` : "",
          company ? `Company: ${company}` : "",
          location ? `Location: ${location}` : "",
          jobType ? `Employment Type: ${jobType}` : "",
          data.validThrough ? `Application Deadline: ${data.validThrough}` : "",
          description
        ].filter(Boolean).join("\n");

        jobs.push({
          title: data.title || null,
          company,
          location,
          jobType,
          url,
          summary: description.slice(0, 1800),
          structuredText
        });
      }
    } catch {
      // Some pages include malformed analytics JSON in application/ld+json.
    }
  });

  return jobs;
}

const genericLabels = /^(apply|apply now|view|view job|view details|details|learn more|read more|open|see all|view all|view \d+ openings?|jobs?|careers?|openings?|back|next|previous|keep me posted)$/i;
const ignoredHref = /(?:facebook|linkedin|twitter|instagram|youtube|privacy|terms|login|sign-in|mailto:|tel:|javascript:)/i;
const jobPath = /(?:\/jobs?\/[^/?#]+|\/openings?\/[^/?#]+|\/positions?\/[^/?#]+|\/vacanc(?:y|ies)\/[^/?#]+|[?&](?:job_?id|jobid|gh_jid|lever-source|position)=?[^&#]+)/i;

function isLikelyTitle(label: string) {
  const value = normalizeWhitespace(label);
  if (value.length < 4 || value.length > 160 || genericLabels.test(value)) return false;
  if (!/[A-Za-zÀ-ÖØ-öø-ÿ\u0980-\u09FF]/.test(value)) return false;
  if (/^(home|about|contact|team|department|location|full[- ]?time|part[- ]?time|remote|hybrid)$/i.test(value)) return false;
  return true;
}


function titleFromAnchor($: cheerio.CheerioAPI, element: any) {
  const explicit = normalizeWhitespace(
    $(element).attr("aria-label") ||
    $(element).attr("title") ||
    $(element).find("h1, h2, h3, h4, strong, [class*='title']").first().text()
  );
  const raw = explicit || normalizeWhitespace($(element).text());
  if (!raw) return "";

  const stripped = raw
    .replace(/\s+(?:Banani,?\s*Dhaka|Dhaka(?:,\s*Dhaka Division)?(?:,\s*Bangladesh)?|Chattogram|Chittagong|Sylhet|Rajshahi|Khulna|Barishal|Rangpur|Mymensingh)\b.*$/i, "")
    .replace(/\s+(?:Full[- ]?time|Part[- ]?time|Internship|Contract|Temporary|Remote|Hybrid|Partially remote)\b.*$/i, "")
    .trim();

  return stripped || raw;
}

function contextForAnchor($: cheerio.CheerioAPI, element: any, label: string) {
  let current = $(element).parent();
  let best = label;
  for (let depth = 0; depth < 6 && current.length; depth += 1) {
    const text = normalizeWhitespace(current.text());
    if (text.length > label.length && text.length <= 720) best = text;
    if (text.length > 720) break;
    current = current.parent();
  }
  return best;
}

function inferLocationFromSummary(summary: string, title: string) {
  const remainder = summary.replace(title, " ").replace(/\s+/g, " ").trim();
  const match = remainder.match(/\b(?:Banani,?\s*Dhaka|Dhaka(?:,\s*Dhaka Division)?(?:,\s*Bangladesh)?|Chattogram|Chittagong|Sylhet|Rajshahi|Khulna|Barishal|Rangpur|Mymensingh|Remote|Hybrid)\b/i);
  return match?.[0] || null;
}

function inferTypeFromSummary(summary: string) {
  const matches = summary.match(/\b(full[- ]?time|part[- ]?time|internship|contract|temporary|freelance|partially remote|remote|hybrid|on[- ]?site)\b/gi);
  return matches?.length ? [...new Set(matches)].slice(0, 2).join(" | ") : null;
}

function listingJobs(html: string, sourceUrl: string, fallbackCompany?: string | null): DiscoveredJob[] {
  const $ = cheerio.load(html);
  const found = new Map<string, DiscoveredJob>();

  $("a[href]").each((_, element) => {
    const href = $(element).attr("href")?.trim();
    if (!href || ignoredHref.test(href)) return;

    const url = canonicalUrl(href, sourceUrl);
    if (!url || samePage(url, sourceUrl)) return;

    const label = titleFromAnchor($, element);

    const pathLooksLikeJob = jobPath.test(new URL(url).pathname + new URL(url).search);
    if (!pathLooksLikeJob && !/job|opening|position|vacancy/i.test(`${href} ${$(element).attr("class") || ""}`)) return;
    if (!isLikelyTitle(label)) return;

    const summary = contextForAnchor($, element, label);
    const existing = found.get(url);
    if (!existing || summary.length > existing.summary.length) {
      found.set(url, {
        title: label,
        company: fallbackCompany || null,
        location: inferLocationFromSummary(summary, label),
        jobType: inferTypeFromSummary(summary),
        url,
        summary
      });
    }
  });

  return [...found.values()].slice(0, maxLinks);
}

function rssFeedUrls(html: string, sourceUrl: string) {
  const $ = cheerio.load(html);
  const urls = new Set<string>();

  $("link[rel='alternate']").each((_, node) => {
    const type = $(node).attr("type") || "";
    const href = $(node).attr("href");
    if (/rss|atom|xml/i.test(type) && href) {
      const absolute = canonicalUrl(href, sourceUrl);
      if (absolute) urls.add(absolute);
    }
  });

  $("a[href]").each((_, node) => {
    const href = $(node).attr("href");
    const text = normalizeWhitespace($(node).text());
    if (!href || !/rss|atom|jobs? feed|openings? feed/i.test(`${href} ${text}`)) return;
    const absolute = canonicalUrl(href, sourceUrl);
    if (absolute) urls.add(absolute);
  });

  return [...urls].slice(0, 3);
}

async function rssJobs(html: string, sourceUrl: string, fallbackCompany?: string | null): Promise<DiscoveredJob[]> {
  const jobs: DiscoveredJob[] = [];
  for (const feedUrl of rssFeedUrls(html, sourceUrl)) {
    try {
      const xml = await fetchHtml(feedUrl);
      const $ = cheerio.load(xml, { xmlMode: true });
      $("item, entry").each((_, node) => {
        const item = $(node);
        const title = normalizeWhitespace(item.find("title").first().text());
        const linkText = item.find("link").first().text().trim();
        const linkHref = item.find("link").first().attr("href");
        const url = canonicalUrl(linkHref || linkText, sourceUrl);
        if (!url || !isLikelyTitle(title)) return;

        const descriptionHtml = item.find("description, summary, content\\:encoded, content").first().text();
        const summary = htmlToText(descriptionHtml);
        jobs.push({
          title,
          company: fallbackCompany || null,
          location: inferLocationFromSummary(summary, title),
          jobType: inferTypeFromSummary(summary),
          url,
          summary
        });
      });
    } catch (error) {
      console.warn(`Could not read jobs feed ${feedUrl}`, error);
    }
  }
  return jobs;
}

function mergeDiscoveries(items: DiscoveredJob[]) {
  const merged = new Map<string, DiscoveredJob>();
  for (const item of items) {
    const key = canonicalUrl(item.url) || item.url;
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, item);
      continue;
    }
    merged.set(key, {
      title: item.title || existing.title,
      company: item.company || existing.company,
      location: item.location || existing.location,
      jobType: item.jobType || existing.jobType,
      url: key,
      summary: item.summary.length > existing.summary.length ? item.summary : existing.summary,
      structuredText: item.structuredText || existing.structuredText
    });
  }
  return [...merged.values()].slice(0, maxLinks);
}

function appearsToBeSingleJob(url: string, html: string) {
  if (jobPath.test(new URL(url).pathname + new URL(url).search)) return true;
  const $ = cheerio.load(html);
  return Boolean(
    $("meta[property='og:type'][content='article']").length ||
    $("[class*='job-description'], [class*='job_details'], [class*='job-details']").length
  );
}

function sourceOrGlobal(sourceValue: string | null, globalValue?: string | null) {
  return parseJsonArray(sourceValue).length ? sourceValue : globalValue || "[]";
}

function safeCompanyName(sourceName: string, discovered?: string | null) {
  if (discovered && !/^(unknown|jobs?|careers?|openings?)$/i.test(discovered)) return discovered;
  return sourceName.replace(/\s+(careers?|jobs?|openings?|career page)$/i, "").trim() || sourceName;
}

async function enrichDiscoveredJob(item: DiscoveredJob, sourceName: string) {
  let detailText = item.structuredText || item.summary;
  try {
    const detailHtml = await fetchHtml(item.url);
    const text = textFromHtml(detailHtml);
    if (text.length >= 80) detailText = text;
  } catch (error) {
    console.warn(`Using listing metadata because detail page could not be fetched: ${item.url}`, error);
  }

  const hints: JobParseHints = {
    title: item.title,
    company: safeCompanyName(sourceName, item.company),
    location: item.location,
    jobType: item.jobType,
    applyUrl: item.url
  };

  const input = [
    item.title ? `Job Title: ${item.title}` : "",
    hints.company ? `Company: ${hints.company}` : "",
    item.location ? `Location: ${item.location}` : "",
    item.jobType ? `Employment Type: ${item.jobType}` : "",
    `Apply URL: ${item.url}`,
    detailText
  ].filter(Boolean).join("\n");

  return { input, hints };
}

export async function scanSource(sourceId: string) {
  const source = await prisma.jobSource.findUnique({
    where: { id: sourceId },
    include: { user: { include: { settings: true } } }
  });
  if (!source) throw new Error("Source not found");
  if (source.status === "PAUSED") return { created: 0, skipped: 0, discovered: 0 };

  const preferences = {
    keywords: sourceOrGlobal(source.keywords, source.user.settings?.roleKeywords),
    excludedKeywords: sourceOrGlobal(source.excludedKeywords, source.user.settings?.excludedKeywords),
    locationPreference: sourceOrGlobal(source.locationPreference, source.user.settings?.locations),
    jobTypes: sourceOrGlobal(source.jobTypes, source.user.settings?.preferredJobTypes)
  };

  try {
    const html = await fetchHtml(source.url);
    const pageCompany = metadataCompany(html) || safeCompanyName(source.name);
    let discovered = mergeDiscoveries([
      ...(await rssJobs(html, source.url, pageCompany)),
      ...jsonLdJobs(html, source.url, pageCompany),
      ...listingJobs(html, source.url, pageCompany)
    ]);

    // A URL can itself be a single job detail page. Only then is the page body
    // treated as one posting; a multi-role listing is never collapsed into an
    // “Untitled Job”.
    if (!discovered.length && appearsToBeSingleJob(source.url, html)) {
      discovered = [{
        title: null,
        company: pageCompany,
        location: null,
        jobType: null,
        url: source.url,
        summary: textFromHtml(html)
      }];
    }

    let created = 0;
    let skipped = 0;

    for (const item of discovered) {
      const { input, hints } = await enrichDiscoveredJob(item, pageCompany);
      const parsed = await parseJobText(input, preferences, hints);
      const preferenceText = `${parsed.title}\n${parsed.company}\n${parsed.location || ""}\n${parsed.jobType || ""}\n${parsed.description}\n${parsed.requirements || ""}`;

      if (!matchesPreferences(preferenceText, preferences)) {
        skipped += 1;
        continue;
      }

      const directUrl = canonicalUrl(parsed.applyUrl || item.url) || item.url;
      const duplicate = await prisma.job.findFirst({
        where: {
          userId: source.userId,
          OR: [
            { applyUrl: directUrl },
            { sourceUrl: directUrl },
            {
              title: { equals: parsed.title, mode: "insensitive" },
              company: { equals: parsed.company, mode: "insensitive" }
            }
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
          company: parsed.company || pageCompany,
          location: parsed.location || null,
          deadline: parsed.deadlineDate,
          category: parsed.category,
          jobType: parsed.jobType || null,
          salary: parsed.salary || null,
          description: parsed.description,
          requirements: parsed.requirements || null,
          applyUrl: directUrl,
          sourceUrl: directUrl,
          rawText: input.slice(0, 14000),
          relevanceScore: computeRelevance(preferenceText, preferences)
        }
      });
      created += 1;
    }

    await prisma.jobSource.update({
      where: { id: source.id },
      data: { lastScannedAt: new Date(), lastError: null, status: "ACTIVE" }
    });
    await prisma.crawlerLog.create({
      data: {
        sourceId: source.id,
        status: "SUCCESS",
        jobsFound: created,
        message: `${discovered.length} roles discovered, ${created} imported, ${skipped} skipped`
      }
    });

    return { created, skipped, discovered: discovered.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown crawler error";
    await prisma.jobSource.update({
      where: { id: source.id },
      data: { lastScannedAt: new Date(), lastError: message, status: "ERROR" }
    });
    await prisma.crawlerLog.create({
      data: { sourceId: source.id, status: "ERROR", jobsFound: 0, message }
    });
    throw error;
  }
}
