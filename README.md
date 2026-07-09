# ApplyPilot AI

**Tagline:** Your AI-assisted command center for every career opportunity.

ApplyPilot AI is a full-stack webapp for personal and SaaS-ready job discovery, source monitoring, pasted job parsing, deadline tracking, and application pipeline management.

## What is included

- Modern Next.js dashboard
- Login-protected single-owner workspace
- PostgreSQL database with Prisma schema
- Source manager for company/government/academic career pages
- Smart scanner/crawler with structured-data extraction and HTML link discovery
- Optional Playwright rendering for dynamic career pages
- AI-assisted paste parser with optional OpenAI API key
- Regex/heuristic fallback parser if no AI key is set
- Auto category classification:
  - Government Job
  - Private & Corporate
  - Academic & Research
- Relevance scoring based on role keywords, exclusions, location, and job type
- Manual job entry
- Job detail page
- Status tracker: New, Saved, Applied, Interview, Offer, Rejected, Archived
- Kanban-style application tracker
- PWA manifest and custom SVG logo
- Redis/BullMQ worker for recurring scans
- Docker Compose for Postgres + Redis

## Tech stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Prisma ORM
- PostgreSQL
- Redis + BullMQ
- Cheerio + Got
- Playwright optional crawler mode

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create environment file

```bash
cp .env.example .env
```

Update these values in `.env`:

```env
APP_SESSION_SECRET="use-a-long-random-secret"
APP_SINGLE_USER_EMAIL="your@email.com"
APP_SINGLE_USER_PASSWORD="your-strong-password"
OPENAI_API_KEY="optional"
```

### 3. Start database and Redis

```bash
docker compose up -d
```

### 4. Push schema and seed owner account

```bash
npm run db:push
npm run db:seed
```

### 5. Start the webapp

```bash
npm run dev
```

Open:

```txt
http://localhost:3000
```

Default seeded login if you did not change `.env`:

```txt
Email: owner@applypilot.local
Password: ApplyPilot#2026
```

### 6. Start background worker in another terminal

```bash
npm run worker
```

## Manual scan

```bash
npm run scan:once
```

Or use the **Scan now** / **Scan all sources** buttons inside the UI.

## AI parser behavior

If `OPENAI_API_KEY` is set, pasted jobs and crawled pages are parsed through the Responses API. If it is not set, ApplyPilot uses a local heuristic parser, so the app remains functional without paid AI access.

## Crawler modes

Default:

```env
CRAWLER_FETCH_MODE="html"
```

For JavaScript-heavy career pages:

```env
CRAWLER_FETCH_MODE="playwright"
```

Then install browsers:

```bash
npx playwright install chromium
```

## Production deployment notes

Recommended deployment:

- App: Vercel/Railway/Render
- Worker: Railway/Render/Fly.io VPS worker process
- DB: Managed PostgreSQL
- Redis: Upstash/Redis Cloud
- File storage, if added later: Cloudflare R2/S3

Run production commands:

```bash
npm run build
npm run start
npm run worker
```

## Important files

```txt
prisma/schema.prisma              Database schema
src/lib/crawler.ts                Career source scanner
src/lib/parser.ts                 AI + fallback job parser
src/lib/classifier.ts             Category classifier
src/lib/relevance.ts              Relevance scoring
src/scripts/worker.ts             Background scan worker
src/app/page.tsx                  Main dashboard
src/app/jobs/page.tsx             Filterable job board
src/app/sources/page.tsx          Smart source manager
src/app/import/paste/page.tsx     Paste-to-job parser
src/app/applications/page.tsx     Application tracker
```

## Future upgrade ideas

- Chrome extension for one-click job saving
- Email reminders
- Resume and cover-letter generator
- CV match scoring
- Team workspace
- Subscription billing
- Multi-user organization mode
- Custom adapters for difficult career sites
