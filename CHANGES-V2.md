# ApplyPilot AI 2.0 — What changed

## 1. Multi-role career pages

- The scanner now discovers and follows individual job links.
- Supports RSS/Atom feeds, JSON-LD JobPosting data, standard ATS job paths, and optional Playwright rendering.
- The main career page is no longer saved as one “Untitled Job”.
- Direct individual job URLs are stored in both `applyUrl` and `sourceUrl`.
- Detail-page failures fall back to listing metadata instead of losing the role.

## 2. Paste extraction

- Added deterministic field extraction for common deadline, company, location, job type, salary, and requirement formats.
- Added optional OpenAI structured output, while keeping the free parser as the default fallback.
- Added an Original Job URL field because copied webpage text normally omits its browser URL.
- Added a review/edit screen before saving.
- Saved descriptions and requirements are concise; the full pasted post is not displayed as the job body.
- Matching scores remain internal and are removed from all visible interfaces.

## 3. Automatic scanning

- Replaced the paid Render/BullMQ worker with GitHub Actions.
- The workflow checks due sources hourly.
- Individual source intervals remain 12 hours, 24 hours, 7 days, or manual.
- Removed Scan Now buttons from the interface.
- Added last scan, next scan, and latest result to source cards.

## 4. Application tracker

- Rebuilt as a six-stage visual board: To Review, Saved, Applied, Interview, Offer, Rejected.
- Added summary metrics, company/ATS icons, deadlines, location, detail buttons, and direct job links.
- New jobs are visible in To Review rather than making the board appear empty.

## 5. Link-first workflow

- Direct job/application links are prominent on job cards, details, dashboard, and tracker.
- Paste and manual forms support direct links.
- Source cards link to the original career page.

## 6. Complete UI redesign

- New professional design system, responsive page structure, and improved typography/hierarchy.
- Persistent day/night theme.
- Desktop sidebar, top status bar, and mobile bottom navigation.
- Company/ATS favicon with initials fallback.
- New source controls: pause, retry/resume, remove.
- New job control: delete incorrect/duplicate records.

## Legacy data

Run once after deployment:

```bash
npm run repair:data
```

It repairs previously pasted jobs, removes collapsed listing records, and queues affected sources for a fresh automatic scan.
