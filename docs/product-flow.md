# Product flow

Short map of how an owner moves through BizOS after sign-in. For deployment and env names see [DEPLOY.md](./DEPLOY.md). For control-plane vs Orgo desk semantics see [architecture.md](./architecture.md).

## Journey

1. **Account** — Magic link (Supabase) or demo session cookie. Middleware gates `/command-center`, `/constructing`, and `/workspace/*`.
2. **Command center** (`/command-center`) — Lists businesses owned by the signed-in user. **Start new business** sends you through triage and opportunities to construct a venture.
3. **Workspace** (`/workspace/{businessId}`) — Per-business Grok-style shell: chat, approvals, routines, and a view of the shared Orgo desk. The agent turn loop runs on the BizOS server, not on the Orgo VM.
4. **Public site** (`/b/{slug}`) — Customer-facing page for that business: hero, lead form, link back to the owner workspace.

## Constructing a new business

Triage (`/triage`) collects answers in the browser. Opportunities (`/opportunities`) picks a live template. Constructing (`/constructing`) syncs the profile and calls `POST /api/business`. Provisioning jobs (Orgo desk, Treg budget, Composio identity) drain from the outbox via cron or owner retry.

## Related docs

- [DEPLOY.md](./DEPLOY.md) — Vercel, Neon, cron, and environment variable names for auth and provisioning.
- [architecture.md](./architecture.md) — Orgo one desk per business, server-side agent loop, tenancy.
- [SMOKE.md](./SMOKE.md) — Manual smoke checks (expanded in provisioning smoke doc when shipped).