# Architecture

## Which base, and why

Both repos were read before this app was written (14 Nov 2026).

[Rakazo](https://github.com/elie222/rakazo) (Apache-2.0) is a full Grok Bot alternative: routines, approvals with spending limits, a per-bot computer, group chats, and a chat UI inside `packages/chat-ui`. Computers are pluggable. The README lists Docker, E2B, Novita, Daytona, CreateOS, Boat, Boxd, Instabox, and Railway. Orgo is not one of them. Local development wants Node.js 24.15 or newer, pnpm 12, Postgres, and Docker. The product is apps for web, API, worker, Electron, and Expo. We did not copy Rakazo source.

[grokbot-clone](https://github.com/nickvasilescu/grokbot-clone) (MIT) is a smaller web app: a Hono server and a React chat. The parts that match CNSTRCT are already isolated:

- `server/src/agent/loop.ts`: one queue per bot, tool calls in order, a pending batch that pauses on an approval card and resumes when the owner answers.
- `server/src/agent/tools.ts`: the bot's own computer and shell run freely. Composio writes pause for approval.
- `server/src/routines.ts` and `proactive.ts`: scheduled work and check-ins that report back in chat.
- `server/src/orgo.ts`, `computer.ts`, `vnc.ts`: one Orgo computer, a screen per bot, and a viewer.
- `web/src/components/ChatView.tsx` and `ComputerViewer.tsx`: the chat and computer surface.

It does not boot without `XAI_API_KEY`, `ORGO_API_KEY`, and `COMPOSIO_API_KEY`, and it has no local sandbox. The server runtime is about 2,500 lines.

CNSTRCT adapts grokbot-clone.

1. This demo has to run on Node 22 with no Docker and no API keys. Rakazo's own quick start does not.
2. The computer CNSTRCT asked for is Orgo first, then a local or Docker fallback. grokbot already speaks the Orgo API. Rakazo's provider list does not include Orgo.
3. The approval card, the routine fire, and the per-agent computer are small enough to sit inside a Next.js dashboard this week. Rakazo's versions sit behind Postgres, a worker, and desktop and mobile clients.
4. Neither project is keyless out of the box. Wrapping grokbot's loop with a scripted model and a folder sandbox keeps the control flow and still demos. Forking Rakazo would mean standing up a platform we cannot boot here.

The MIT notice and the list of changes are in `THIRD_PARTY_NOTICES.md`.

## How a turn works

`enqueue` in `src/lib/agent/loop.ts` runs one turn at a time per agent.

1. A user message or a routine is stored.
2. The model returns text and zero or more tool calls. With no `XAI_API_KEY` or `OPENAI_API_KEY`, `mockModel` follows the home-services script. With a key, the server calls that vendor's chat completions API and falls back to the script if the call fails.
3. Computer tools (`shell`, `write_file`, `read_file`, `list_files`, `screenshot`) call `policyFor` and wait. Composio's write approval does not cover a shell.
4. `send_outreach`, `send_match`, and `spend` also call `policyFor`. The default is ask. The loop writes an approval card and stores the batch in `pending_turns`. The owner can approve, reject, or approve an edited draft.
5. Approve runs the unchanged tool. An edited textarea uses Approve edited draft. Reject writes a refusal and tells the model not to retry. Always allow stores a policy for that agent, that tool, and that business.
6. A newer message to the orchestrator expires every open approval and delegated task on that desk, including specialist cards.

Nothing in those three gated tools opens a network socket. Approve writes `outbox/*.json` with `network: false`.

## The computer and agent runtime

The Grok-style **turn loop** (`src/lib/agent/loop.ts`, tools, approvals, routines) runs entirely on the **BizOS server** (Next.js). Orgo is the **specialist shell only**: a shared Linux desk VM per business where `shell` and related computer tools execute when a job has provisioned `orgo_computer_id`.

`configuredProvider()` picks Orgo when `ORGO_API_KEY` is set, otherwise Docker if `docker version` succeeds, otherwise a folder under `data/sandboxes/<agentId>` per agent for local demo.

The local sandbox allows a short command list (`ls`, `cat`, `mkdir`, `echo`, and similar) plus `cnstrct-search`, which reads a built-in tradie directory. `find` is not allowed. Chaining, newlines, pipes, redirects, curl, interpreters, execution flags (`-exec`, `-ok`, `-delete`, `-fprint`), and paths outside the folder are rejected. Always-allow skips the card only. The same check runs before local spawn and before Orgo bash. The dashboard computer view shows each agent's terminal log, files, and computer hours. It is not a fake screenshot of a desktop the process never had.

When `ORGO_API_KEY` is set, provisioning creates **one Orgo workspace per business** and **one shared desk computer** (`orgo_computer_id` on the business row). Specialists bash into that VM; the orchestrator does not get a separate machine. Bash calls resume/start on that desk idempotently before commands. Quinn has no machine. Start over deletes the business desk on Orgo when possible; ids stay on failure so the owner can retry.

See [product-flow.md](./product-flow.md) for the owner journey (account → command center → workspace → public site).

## Routines

Each blueprint role is created with a routine, including Quinn's morning brief. The label is a plan ("Weekdays at 8:00"). Opening the desk does not run them, and `startScheduler` does not start a timer. The owner presses Queue. That is the only fire path. grokbot used croner. CNSTRCT still stores an interval so a later signed cron can call the same queue function.

## Tenancy and auth

A user owns a profile, one business, that business's public site at `/b/[slug]`, and that business's agents. The sample desk `harbor-tradie-desk` belongs to `user_sample` and is not the signed-in demo user.

With no Supabase keys, `POST /api/session` sets an httpOnly `cnstrct_sid` cookie and a user row. With `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `POST /api/auth/magic` asks Supabase to email a link, and `POST /api/auth/verify` accepts `token_hash` from `/auth/callback`. The email template has to land on that page with `token_hash` and `type`. The demo cookie still works when those keys are absent.

Local and test state is SQLite in `data/cnstrct.db` (or `CNSTRCT_DATA_DIR`). Production state is Neon when `DATABASE_URL` or `POSTGRES_URL` is set. Vercel refuses SQLite. See [docs/DEPLOY.md](docs/DEPLOY.md).

## Product flow

The numbered owner journey (landing, triage, command center, workspace, public `/b/[slug]`) lives in [product-flow.md](./product-flow.md) so this file stays focused on runtime architecture.

## Adding a business type

1. Add a template in `src/lib/templates.ts` with `live: false` until the prompts exist.
2. Add card copy in the opportunities route. Personalize from the profile the way `liveCardCopy` does.
3. When it is ready, add a `BusinessBlueprint` in `src/lib/agent/blueprint.ts`: one orchestrator, two specialists, tools, and routines. `openDesk` does not grow a new branch per template.
4. Keep outbound tools on the approval policy. Do not add a path that sends or spends without a card.
5. Flip `live` to true. The board already renders whatever the catalog marks live. Leave the other cards non-selectable.

Do not add billing or custom domains here.

## Next templates

Same shape as home services: a public page, one or two agents, routines, and approval before anything leaves the machine. All three can start with almost no cash.

1. **Mobile detailing booking desk.** A page that takes a driveway and a time. One agent drafts partnerships with detailers who already own the gear. One matches jobs. Capital is a hose and a borrowed driveway. The margin is on the booking.
2. **Estate-clearance resale desk.** A page for families clearing a house. One agent drafts pickup-partner notes. One drafts marketplace listings. Approval before a listing is posted. Capital is a tape measure and a storage corner.
3. **After-school tutoring match.** A page for parents. One agent drafts tutor outreach. One drafts the introduction. Approval before anyone is connected. Capital is a phone and a calendar.

Detailing and estate clearance are the two coming-soon cards. Tutoring is the third to add after those.

## Mocked vs live

| Piece | No keys | With keys |
| --- | --- | --- |
| Triage, cards, site, leads | Live, stored in the database | Same |
| Agent chat and routines | Owner chats with Quinn. Specialists take tasks. Routines stay planned | xAI if `XAI_API_KEY` is set, else OpenAI |
| Computer | Status not configured. Local folder is labeled as a sandbox | One shared Orgo desk VM per business after provisioning; Quinn has none |
| Email, match intro, shell | Approval card, then a local outbox or local command | Gmail send is not available. The outbox stays local and is not marked sent |
| Auth | Demo session cookie | Supabase magic link when both public vars are set |
