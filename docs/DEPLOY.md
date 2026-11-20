# Deploy BizOS on Vercel

BizOS (repo **CNSTRCT**) is a Next.js app with API routes and SQLite (`node:sqlite`). It runs in **demo mode** with no API keys. Production: [https://cnstrct-mu.vercel.app](https://cnstrct-mu.vercel.app).

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
   | `CNSTRCT_DATA_DIR` | `/tmp/cnstrct-data` (ephemeral on serverless; see README **Hosted demo: what persists**) |
   | `NEXT_PUBLIC_SITE_URL` | `https://cnstrct-mu.vercel.app` (no trailing slash) |

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

## Updating marvelus-tech.github.io

After the first production deploy, set public links to **https://cnstrct-mu.vercel.app**.