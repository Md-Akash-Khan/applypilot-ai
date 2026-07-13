# ApplyPilot AI 2.0

**Your AI-assisted command center for every career opportunity.**

ApplyPilot AI is an online job-discovery and application workspace that replaces a manually maintained job spreadsheet. It monitors career pages, separates multi-role listings into individual opportunities, extracts only essential job data, preserves direct application links, and tracks each opportunity from discovery to offer.

## Version 2 highlights

- Professional responsive interface with persistent **light and dark modes**
- Modern dashboard, filterable job library, source monitor, and visual application pipeline
- Company/ATS favicon or initials on job and tracker cards
- Direct **Job link / Apply** actions throughout the dashboard, cards, details, and tracker
- Career-listing discovery that follows individual role links instead of storing an entire listing page as one job
- RSS/Atom, JSON-LD `JobPosting`, standard HTML link, and optional Playwright discovery
- Rebuilt paste parser with an editable review step
- Extracts title, company, location, deadline, type, category, salary, concise summary, requirements, and direct URL
- Full pasted content is kept only as private raw source data; it is not displayed as the job description
- Internal matching score is no longer shown in the interface
- Scheduled scanning through **GitHub Actions**—no Render worker or Redis required
- Source pause/resume/remove controls and incorrect-job deletion
- One-time repair command for records created by the older crawler/parser

## Stack

- Next.js App Router, React, TypeScript
- Prisma ORM and PostgreSQL/Neon
- GitHub Actions scheduled automation
- Cheerio, Got, robots.txt support
- Optional Playwright browser rendering
- Optional OpenAI Responses API structured extraction

## Online architecture

```text
GitHub repository
    ├── Vercel deployment → ApplyPilot web app
    └── GitHub Actions → scheduled source scanner
                              │
                              ├── company career pages / job feeds
                              └── Neon PostgreSQL
```

Redis, BullMQ, Render, and an always-on worker are not required in version 2.

## Required environment variables

Copy `.env.example` to `.env` only for Codespaces or local maintenance. Never commit `.env`.

```env
DATABASE_URL="your-neon-postgresql-url"
APP_SESSION_SECRET="a-long-random-secret"
NEXT_PUBLIC_REPOSITORY_URL="https://github.com/OWNER/REPOSITORY"
```

Optional:

```env
OPENAI_API_KEY=""
OPENAI_MODEL="gpt-5.6-luna"
CRAWLER_FETCH_MODE="html"
```

The deterministic parser works without an OpenAI key.

## Existing deployment upgrade

### 1. Replace repository files

Commit and push this version to the existing GitHub repository. Vercel will redeploy automatically.

```bash
git add .
git commit -m "Upgrade ApplyPilot AI to version 2"
git push
```

### 2. Database

The Prisma schema has not changed, so no new migration is required. Running this is safe:

```bash
npm install
npx prisma generate
npx prisma db push
```

### 3. Repair old records once

This command:

- re-extracts fields from older pasted jobs;
- removes collapsed “Untitled Job” career-listing records;
- marks affected sources for a fresh automatic scan.

```bash
npm run repair:data
```

Then manually run the GitHub workflow once, or wait for the next scheduled run:

```text
GitHub → Actions → ApplyPilot Scheduled Scan → Run workflow
```

### 4. GitHub Actions secret

Repository:

```text
Settings → Secrets and variables → Actions → New repository secret
```

Required secret:

```text
DATABASE_URL = the same Neon connection string used by Vercel
```

Optional secret:

```text
OPENAI_API_KEY
```

Optional repository variables:

```text
OPENAI_MODEL=gpt-5.6-luna
CRAWLER_FETCH_MODE=playwright
```

Use `playwright` only when a career page renders its role links entirely with JavaScript. The default `html` mode is faster and handles normal pages, feeds, structured job data, and sites such as standard ATS listing pages.

## Automatic schedule

`.github/workflows/scheduled-scan.yml` checks due sources every hour. Each source still follows its selected interval:

- Every 12 hours
- Every 24 hours
- Every 7 days
- Manual only

No user click is required. The Sources page shows the last result and next expected scan. A due source is normally picked up within the next hourly workflow run.

## Paste parser workflow

1. Paste the original job URL when available.
2. Paste the post content.
3. Click **Extract job details**.
4. Review/edit the structured fields.
5. Save the reviewed opportunity.

The URL input matters because copied webpage or LinkedIn text often does not contain its own browser address.

## Crawler behavior

For every monitored source, ApplyPilot attempts, in order:

1. RSS/Atom job feeds
2. JSON-LD `JobPosting` records
3. Individual job/opening/position links in the listing HTML
4. Optional browser-rendered HTML through Playwright

Each discovered role is parsed and saved separately. A multi-role career page is not stored as a single long job record. If a detail page cannot be fetched, listing metadata is still used to create a minimal usable opportunity with its direct role URL.

## Commands

```bash
npm run dev          # local development
npm run build        # production build
npm run db:push      # sync Prisma schema
npm run db:seed      # create/update owner account
npm run scan:once    # run all due sources once
npm run repair:data  # repair legacy records once
```

## Important files

```text
.github/workflows/scheduled-scan.yml  Free scheduled automation
src/lib/crawler.ts                    Multi-role source discovery
src/lib/parser.ts                     Deterministic + optional AI extraction
src/lib/schedule.ts                   Per-source due-time logic
src/scripts/scan-once.ts              Scheduled scan entry point
src/scripts/repair-data.ts            Legacy data cleanup and repair
src/components/PasteImporter.tsx      Review-before-save paste workflow
src/app/applications/page.tsx         Modern application tracker
src/app/globals.css                   Light/dark design system
```

## Security

- Keep `DATABASE_URL`, session secrets, and API keys in Vercel/GitHub secrets only.
- Do not commit `.env`.
- Change the initial owner password before wider use.
- The product remains a private single-owner workspace unless multi-user authentication is deliberately added later.
