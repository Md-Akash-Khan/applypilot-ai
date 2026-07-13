# ApplyPilot AI 2.0 — Existing Live Site Upgrade

1. Upload/replace the repository with the version 2 files and push to `main`.
2. Wait for Vercel to finish the automatic redeployment.
3. Open GitHub Codespaces and confirm `.env` contains the same Neon `DATABASE_URL` used by Vercel.
4. Run:

```bash
npm install
npx prisma generate
npx prisma db push
npm run repair:data
```

5. Open GitHub **Actions → ApplyPilot Scheduled Scan → Run workflow**.
6. The old collapsed Therap “Untitled Job” record will be removed; the source is reset and the new scanner can import each matching role separately.
7. Remove any remaining irrelevant test records using the new **Delete job** control.
8. Remove the old `Example Career Page` source using **Remove source**.
9. Redis/Upstash and Render are no longer required. `REDIS_URL` may be removed from Vercel after version 2 is deployed.

No database migration is required because the Prisma schema is unchanged.
