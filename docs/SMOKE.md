# Production smoke checklist

**Canonical app URL:** https://cnstrct-app.vercel.app

Run this after a production deploy (or against local `pnpm start` with production env vars).

## Hosted demo banner

When `NEXT_PUBLIC_SITE_URL` is not localhost and `CNSTRCT_DATA_DIR` is under `/tmp`, the top banner should mention ephemeral storage and link to the seeded desk.

## Flow

1. **`/`** — Landing loads. **Start** explores triage without login. **Log in** lands on **`/command-center`** (no triage).
2. **`/command-center`** — **Start new business** → fresh **`/triage?intent=new`** → **`/opportunities`** → construct.
3. **`/triage`** — Eight questions save; then redirect to opportunities.
4. **`/opportunities`** — Three cards; **home-services** and **mobile-detailing** are **Live** and start constructing. **estate-clearance** is **Soon**.
5. **`/constructing?template=home-services`** — Finishes and lands on command center with a new business.
6. Repeat **Start new business** to try **`/constructing?template=mobile-detailing`** — Riley + Sam agents, detailing site copy.
7. **`/command-center`** — Lists your businesses with workspace and public site links.
8. **`/workspace/[businessId]`** — Chat, approvals, computer, leads load for the chosen desk.
9. **`/b/[slug]`** — Public site and lead form for your business slug.
10. **`/b/harbor-tradie-desk`** — Seeded sample desk always available (no prior session). Lead form saves to sqlite.

## API session check

- `GET /api/session` — Returns JSON for the signed-in demo user when the `cnstrct_sid` cookie is present.

After persistence work, expect session data to **survive warm requests** on the same serverless instance but **not** across cold starts or deploys when sqlite lives under `/tmp`. If sqlite resets, call `POST /api/auth/demo` or **Start** again to refresh the session cookie, then re-run triage if the profile row is gone.

## Build parity

```bash
pnpm install
pnpm test
pnpm build
```