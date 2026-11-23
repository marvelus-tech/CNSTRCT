# BizOS

BizOS spins up a real micro-business from almost nothing. You answer a short triage, pick a live desk, and get a public site plus three agents: Quinn and two specialists. You talk only to Quinn. Nothing is emailed, posted, spent, or run on a computer until you approve it.

This app adapts the agent loop from [grokbot-clone](https://github.com/nickvasilescu/grokbot-clone) (MIT). Why that base, and how to add the next business type, is in [docs/architecture.md](docs/architecture.md). The MIT notice is in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## Deploy (Vercel)

**Production:** [https://cnstrct-mu.vercel.app](https://cnstrct-mu.vercel.app)

Step-by-step import and env vars: [docs/DEPLOY.md](docs/DEPLOY.md). Billing setup: [docs/BILLING.md](docs/BILLING.md).

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
6. Message Quinn to find partners or check leads. Quinn delegates a persisted task. The specialist's command and any outbound draft wait on an approval card. Approve runs the unchanged draft. If you edit the text, Approve turns off and only Approve edited draft runs what you typed. Reject writes nothing to the outbox. A later message to Quinn expires every open approval on the desk, including the specialist card. An approved send writes `outbox/*.json` with `network: false` and is not a sent email.
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
| Billing | Stripe optional at launch. Without Stripe keys, construction stays open (see banner on site). |

## Env vars

Copy `.env.example` to `.env.local` only when you want a live provider. Every variable can stay empty.

| Variable | Effect |
| --- | --- |
| `XAI_API_KEY`, `XAI_MODEL` | Chat completions on xAI. Default model `grok-4.7`. Wins over OpenAI when both are set. A failed call falls back to the scripted model. |
| `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_BASE_URL` | Chat completions on OpenAI, or any compatible base URL. |
| `ORGO_API_KEY` | Key required before any computer is created. Each business gets its own workspace. Each specialist gets one Small computer (0.5 vCPU, 4 GB, 20 GB). Quinn does not. A failed command stays on that computer and does not fall back to the local folder. No secrets sync. |
| Docker | Used only when the daemon answers `docker version`, Orgo is unset, and the owner already approved the command. The container is `alpine` with `--network none`. |
| `COMPOSIO_API_KEY` | Reserved. This MVP does not send Gmail. A set key is still not a sent message. Approved drafts stay in the local outbox with `network: false`. |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Email magic link. The template should land on `/auth/callback` with `token_hash` and `type`. Without the keys, the demo session is the path that always works. |
| `NEXT_PUBLIC_SITE_URL` | Canonical origin. Production: `https://cnstrct-mu.vercel.app`. Local default `http://localhost:3000`. |
| `DATABASE_URL` or `POSTGRES_URL` | Neon (Vercel Postgres) connection string. Required on Vercel. Empty locally, which keeps SQLite in `./data`. | 
| `CNSTRCT_DATA_DIR` | Local SQLite directory. Defaults to `./data`. Not used for production state. |
| Stripe / `BILLING_MODE` | See [docs/BILLING.md](docs/BILLING.md). |

Token and computer-hour meters are a hardcoded demo cap: 50,000 tokens and 2 hours per agent.

## Hosted demo: what persists

**Canonical production URL:** [https://cnstrct-mu.vercel.app](https://cnstrct-mu.vercel.app)

Production requires `DATABASE_URL` or `POSTGRES_URL` (Neon via the Vercel Postgres integration). The app refuses to open SQLite on Vercel, including a data directory under `/tmp`. Sessions, triage profiles, businesses, and agent rows survive cold starts and deploys.

What **does** persist without signing in:

- The app code and UI on each deploy.
- A **seeded sample desk** at [`/b/harbor-tradie-desk`](https://cnstrct-mu.vercel.app/b/harbor-tradie-desk). The first request on an empty database inserts `user_sample` and that business.

What **does not** persist on Vercel:

- Local computer sandbox files. They use `/tmp/cnstrct-sandboxes` and are scratch, not the database.
- Anything saved before this database cutover. The old hosted SQLite file lived under `/tmp` and was already ephemeral.

The amber banner shows only when hosted state is still SQLite under `/tmp`, or when production has no database URL. Local dev is unchanged: SQLite stays in `./data/cnstrct.db` until you set `DATABASE_URL`. See [docs/DEPLOY.md](docs/DEPLOY.md) for cutover and rollback.