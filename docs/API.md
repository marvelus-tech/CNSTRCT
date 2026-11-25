# BizOS HTTP API (CNSTRCT)

Thin reference for native or third-party clients. Secrets (Orgo, Composio, Treg, Resend) are server-only.

**Origin:** set `NEXT_PUBLIC_SITE_URL` in production. Session auth uses the `cnstrct_sid` httpOnly cookie.

## Auth

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/api/auth/magic-link` | Body `{ "email" }`. Sends Supabase OTP when configured. |
| POST | `/api/auth/verify` | Body `{ "tokenHash", "type" }`. Sets session cookie. |
| GET | `/api/auth/callback` | Redirect handler with `token_hash`, `next`. |
| POST | `/api/auth/demo` | Demo session only when Supabase is not configured. |
| POST | `/api/auth/sign-out` | Clears session cookies. |
| GET | `/api/auth/status` | `{ authMode, signedIn, user }`. |

Future native apps may add bearer tokens; not shipped yet (see `docs/ios-readiness.md`).

## Session and profile

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/session` | Current user + optional desk snapshot. 401 if unsigned. |
| PUT | `/api/profile` | Triage answers for the signed-in user. |

## Businesses

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/businesses` | Owner-scoped list with provision labels. |
| POST | `/api/business` | Create desk. Header `Idempotency-Key` supported. |
| GET | `/api/businesses/{id}/provision` | Provision summary. |
| POST | `/api/businesses/{id}/provision` | Owner retry worker pass. |
| POST | `/api/businesses/{id}/desk/wake` | Resume Orgo desk. |
| GET | `/api/businesses/{id}/desk/screenshot` | Owner-only desk preview (30s cache). |

## Workspace / agents

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/desk?businessId=` | Full desk payload for workspace UI. |
| POST | `/api/agents/{id}/messages` | Owner message to orchestrator. |
| POST | `/api/agents/{id}/approvals` | Resolve approval cards. |
| POST | `/api/agents/{id}/routines` | Queue a routine. |

## Connections and prospects

| Method | Path | Notes |
| --- | --- | --- |
| GET/POST | `/api/businesses/{id}/connections` | Composio OAuth start. |
| GET | `/api/businesses/{id}/connections/callback` | OAuth return (server verified). |
| POST | `/api/businesses/{id}/prospects/*` | Treg proxies. 503 until budget is set. |

## Errors

JSON body `{ "error": string, "code"?: string }`. HTTP 401 unsigned, 404 wrong owner, 503 provider not ready.

## Cron

`GET /api/cron/provisioning` with `Authorization: Bearer CRON_SECRET`.