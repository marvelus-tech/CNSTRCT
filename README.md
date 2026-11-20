# CNSTRCT

CNSTRCT spins up a real micro-business from almost nothing. You answer a short triage, pick a live desk, and get a public site plus three agents: Quinn and two specialists. You talk only to Quinn. Nothing is emailed, posted, spent, or run on a computer until you approve it.

This app adapts the agent loop from [grokbot-clone](https://github.com/nickvasilescu/grokbot-clone) (MIT). Why that base, and how to add the next business type, is in [docs/architecture.md](docs/architecture.md). The MIT notice is in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## Deploy (Vercel)

**Stable production URL (after one-time GitHub import):** `https://cnstrct-app.vercel.app`

Step-by-step import, env vars, and why `https://cnstrct.vercel.app` shows another app's login page: [docs/DEPLOY.md](docs/DEPLOY.md).

Until that import finishes, use the latest anonymous demo from the claim/deploy notes in DEPLOY.md or run locally.

## Run

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000. No API keys are required.

```bash
pnpm test
pnpm build
```

The first request creates `data/cnstrct.db` and a sample public desk at `/b/harbor-tradie-desk`. That folder is gitignored.

## Demo

1. Start at `/` and choose **Start** (goes to `/triage` with no sign-in) or **Log in** (demo sign-in at `/login`, default landing `/command-center`).
2. Answer the eight questions. Answers stay in `localStorage` until you sign in. City becomes the business name (`Austin` becomes Austin Home Match).
3. The board at `/opportunities` uses `POST /api/opportunities/preview` when logged out, or saved profile when signed in.
4. **Start this business** asks for login if needed, then **Constructing** syncs triage to your account and runs for a few seconds before the **command center** (`/command-center`).
5. Open **workspace** for your business (`/workspace/[businessId]`). You chat only with Quinn, the chief of staff. The team panel lists Quinn plus two specialists. Connections show Gmail as not configured. Computers show Orgo as not configured, with a local sandbox note that is not an Orgo machine.
6. Message Quinn to find partners or check leads. Quinn delegates a persisted task. The specialist's command and any outbound draft wait on an approval card. Approve, approve an edited draft, or reject. Reject writes nothing to the outbox. Approve of a send, with no Composio key, writes `outbox/*.json` and `network: false`.
7. Routines are listed as planned. Queue is explicit. Nothing runs on a timer.
8. Open the public site from the workspace or visit `/b/harbor-tradie-desk`. The lead form saves a request on the desk. It does not text or email anyone.

`/dashboard` redirects to your latest workspace or the command center.

A new chat message closes an approval that is still open. Approve or reject before you type.

## What works with no keys

| Piece | Behavior |
| --- | --- |
| Triage, cards, site, leads | Stored in local sqlite |
| Auth | Fake login at `/login` sets demo session cookie (`cnstrct_sid`) |
| Agent chat and routines | Scripted model. Owner chats with the orchestrator. Routines stay planned until queued |
| Computer | Orgo status is not configured. A local folder is labeled as a sandbox, not a VM |
| Outreach, match, shell | Approval card, then a local outbox or a local command. No Composio or Orgo call |

## Env vars

Copy `.env.example` to `.env.local` only when you want a live provider. Every variable can stay empty.

| Variable | Effect |
| --- | --- |
| `XAI_API_KEY`, `XAI_MODEL` | Chat completions on xAI. Default model `grok-4.7`. Wins over OpenAI when both are set. A failed call falls back to the scripted model. |
| `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_BASE_URL` | Chat completions on OpenAI, or any compatible base URL. |
| `ORGO_API_KEY`, `ORGO_WORKSPACE_ID` | Key required before any computer is created. Size is Small (0.5 vCPU, 4 GB, 20 GB), one computer per agent. Workspace id is optional. No secrets sync. If create fails, status stays not connected. |
| Docker | Used only when the daemon answers `docker version`, Orgo is unset, and the owner already approved the command. The container is `alpine` with `--network none`. |
| `COMPOSIO_API_KEY` | When set, specialist sessions are direct-tools for that business tenant (`biz_` + business id). Gmail send runs only after approval and only with a stored connected account. Without the key, status is not configured and the outbox stays local. |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Email magic link. The template should land on `/auth/callback` with `token_hash` and `type`. Without the keys, the demo session is the path that always works. |
| `NEXT_PUBLIC_SITE_URL` | Canonical origin. Defaults to `http://localhost:3000`. |
| `CNSTRCT_DATA_DIR` | Where sqlite and sandboxes live. Defaults to `./data`. |

Token and computer-hour meters are a hardcoded demo cap: 50,000 tokens and 2 hours per agent.

## Hosted demo: what persists

**Canonical production URL:** [https://cnstrct-app.vercel.app](https://cnstrct-app.vercel.app) (see [docs/DEPLOY.md](docs/DEPLOY.md)).

Vercel sets `CNSTRCT_DATA_DIR` to `/tmp/cnstrct-data`. That directory is **ephemeral** on serverless: triage answers, demo sessions, workspaces, and agent sandboxes can disappear after a cold start, a new deployment, or when the instance is recycled.

What **does** persist without signing in:

- The app code and UI on each deploy.
- A **seeded sample desk** at [`/b/harbor-tradie-desk`](https://cnstrct-app.vercel.app/b/harbor-tradie-desk). The first request on a fresh sqlite file inserts `user_sample` and that business. You can always open it to walk the public site and lead form.

What **does not** persist reliably on hosted demo:

- Your `cnstrct_sid` cookie and sqlite rows tied to your browser session.
- Agent notes and outbox files under `/tmp/cnstrct-data/sandboxes`.

On production, a banner explains this when `NEXT_PUBLIC_SITE_URL` is not localhost and the data dir lives under `/tmp`. Local dev is unchanged: sqlite stays in `./data/cnstrct.db` on disk.

We did not wire Turso/libsql for this sprint (no paid hosted DB or extra secrets required). Optional `TURSO_*` env vars can be added later for durable hosted sqlite.
