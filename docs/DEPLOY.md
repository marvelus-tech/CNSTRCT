# Deploy BizOS on Vercel

BizOS (repo **CNSTRCT**) is a Next.js app with API routes. Production state is Neon (Vercel Postgres) via `@neondatabase/serverless`. Local dev and `pnpm test` use SQLite (`node:sqlite`) on disk. It runs in **demo mode** with no API keys. Production: [https://cnstrct-mu.vercel.app](https://cnstrct-mu.vercel.app).

## Do not use `bizos-mu.vercel.app`

**https://bizos-mu.vercel.app** is already assigned to a **different** Vercel project (another team's Spanish restaurant SaaS). It is **not** this repository. Do not set `NEXT_PUBLIC_SITE_URL`, docs links, or GitHub **Website** to that hostname.

**Canonical production URL:** **https://cnstrct-mu.vercel.app** (Vercel project **cnstrct-mu**). For public branding, attach a **custom domain** on that project (Settings → Domains) instead of chasing a taken `*.vercel.app` name.

## Why `https://cnstrct.vercel.app` is not CNSTRCT

That hostname is already assigned to a **different** Vercel project. A request to `/` returns **307 → `/login`** with `x-matched-path: /login`. That is another app's sign-in page, not Vercel Deployment Protection on this repository.

This repo does not ship `middleware.ts` or auth gates on `/` or `/triage`. After you deploy **this** codebase, landing and triage are public with no Vercel SSO.

**Fix options:**

1. **Recommended:** Use the linked project **cnstrct-mu** with production URL `https://cnstrct-mu.vercel.app`.
2. **Reuse the name:** In the Vercel team that owns `cnstrct.vercel.app`, delete or rename the old project, then attach `cnstrct.vercel.app` to the CNSTRCT deployment (Project → Settings → Domains).

## One-time import (marvelus-tech)

You only need to do this once per Vercel team. After that, every push to `main` can auto-deploy if Git Integration is enabled.

1. Sign in at [vercel.com](https://vercel.com) with the **marvelus-tech** GitHub account (or a team that should own the app).
2. **Add New… → Project → Import** `marvelus-tech/CNSTRCT`.
3. **Project name:** `cnstrct-mu` (production URL `https://cnstrct-mu.vercel.app`).
4. **Framework:** Next.js (auto-detected). **Root directory:** repository root.
5. **Production branch:** `main`.
6. **Build settings:** `vercel.json` in the repo already sets:
   - Install: `pnpm install`
   - Build: `pnpm build`
7. **Environment variables** (Production; leave LLM/Orgo/Supabase empty for demo mode):

   | Name | Value |
   | --- | --- |
   | `DATABASE_URL` or `POSTGRES_URL` | Neon connection string from the Vercel Postgres / Neon integration. Required. Do not commit it. |
   | `CRON_SECRET` | Random string. Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` to `/api/cron/provisioning`. |
   | `NEXT_PUBLIC_SITE_URL` | `https://cnstrct-mu.vercel.app` (no trailing slash) |

   Optional server-only names (empty in demo mode): `ORGO_API_KEY`, `TREG_TOKEN`, `TREG_ORG_ID`, `COMPOSIO_API_KEY`, `COMPOSIO_WEBHOOK_SECRET`. No `NEXT_PUBLIC_` copies.

   Do **not** set `CNSTRCT_DATA_DIR=/tmp/cnstrct-data`. `vercel.json` no longer does. On Vercel the app refuses to boot SQLite. If that variable is still in the project dashboard from an older deploy, delete it. Sandbox scratch files use `/tmp/cnstrct-sandboxes` and are not application state.

8. **Deployment Protection:** Project → Settings → Deployment Protection → set **Production** to **None** (or "Only Preview Deployments") so colleagues can open the demo without a Vercel login.
9. Click **Deploy**. When the build finishes, copy **Visit** on the Production deployment. That URL is the shareable app link.

### Optional: claim an anonymous CLI deploy

If someone ran `vercel deploy --temporary` from this repo, Vercel may have issued a `.tmp.now` URL and a [claim link](https://vercel.com/claim-deployment). Claiming moves that build into a permanent project. Prefer Git import above for continuous deploys from `main`.

## Verify demo mode

1. Open `/` → **Start** works.
2. Open `/triage` → onboarding UI loads (HTTP 200).
3. `GET /api/session` returns JSON with a demo user (no Supabase keys).

## Local build (same as Vercel)

```bash
pnpm install
pnpm build
pnpm start
```

## Durable database

Production state (users, sessions, profiles, businesses, agents, routines, messages, approvals, policies, leads, tasks, audit, connections, billing, provisioning jobs) is Neon. Production does not open SQLite. The first request applies pending versions in `schema_migrations` (`001_baseline`, `002_provisioning` for the async provider outbox, then `003_treg_budget` for per-business Treg cap state). A failed boot does not record the version, so the next boot retries. `CREATE TABLE IF NOT EXISTS` and one-time `ALTER TABLE` steps make that retry safe.

Business creation enqueues Orgo, Treg, and Composio jobs in the same transaction as the business row. External calls run from `/api/cron/provisioning` (schedule in `vercel.json`), not from `POST /api/business`.

The checked-in cron runs once daily (`0 6 * * *` UTC) so deployments pass on **Vercel Hobby**, which rejects expressions that would run more than once per day. Owners can still drain the outbox immediately via `POST /api/businesses/{id}/provision` (retry). On **Pro**, change `vercel.json` to `*/5 * * * *` for a five-minute worker cadence, or call the cron route from an external scheduler with the same `CRON_SECRET`.

Epoch columns are `BIGINT`. Postgres `INTEGER` is 32-bit and cannot store `Date.now()`.

### Cutover

1. Create a Neon database (Vercel project Storage, or a Neon project) and set `DATABASE_URL` or `POSTGRES_URL` on Production. Preview can use the same database or its own branch. Never put the URL in git.
2. Deploy this release. The first server process creates the tables and, if the slug is absent, the seeded desk `harbor-tradie-desk`.
3. There is nothing durable to copy from the old hosted database. It lived under `/tmp` and already disappeared on cold start. Signed-in demo sessions start over once. The seeded public desk is created again.
4. A local `data/cnstrct.db` stays local until you set `DATABASE_URL`. To keep that file, load it into Neon after `001_baseline` (CSV, `pgloader`, or SQL inserts). Do that before the app seeds `harbor-tradie-desk` if you need that slug yourself, or delete the seeded rows you do not want. This repo does not run a live copy.
5. Remove `CNSTRCT_DATA_DIR=/tmp/cnstrct-data` from the Vercel project if it is still set.
6. Smoke: create a session and a business, then redeploy or open a new instance. The business should still be there. `/b/harbor-tradie-desk` should load.

### Rollback

1. Redeploy the previous release.
2. Put `CNSTRCT_DATA_DIR=/tmp/cnstrct-data` back only if that release still reads SQLite on Vercel. Rows written only to Neon are not copied back. Rollback restores the old ephemeral behavior.
3. Leave the Neon database in place. Deploying this release again skips `001_baseline` when `schema_migrations` already has that version, so those rows remain.
4. Do not delete the Neon branch until you are sure you do not need the rows written after cutover.

## Updating marvelus-tech.github.io

After the first production deploy, set public links to **https://cnstrct-mu.vercel.app**.