# Production smoke test: provisioning (CNS-62)

Repeatable checklist for [cnstrct-mu.vercel.app](https://cnstrct-mu.vercel.app) after auth and provider keys are set on Vercel Production.

## Prerequisites

- `DATABASE_URL` or `POSTGRES_URL` (Neon)
- `ORGO_API_KEY` for live desk provisioning
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` for magic-link sign-in
- `CRON_SECRET` (and optional external cron hitting `/api/cron/provisioning`)
- Optional: `RESEND_API_KEY`, `EMAIL_FROM` for desk-ready mail

## Checklist

| Step | Action | Expected |
| --- | --- | --- |
| 1 | Open `/login`, send magic link to a real inbox | Email arrives from Supabase |
| 2 | Complete callback, land on `/command-center` | Session cookie set; business list loads |
| 3 | Start new business via `/triage` to `/constructing` | `POST /api/business` returns `businessId` |
| 4 | Wait on constructing page | Provision poll reaches `ready` or retry works |
| 5 | Open command center chips | Orgo/Treg/Composio labels readable |
| 6 | Open `/workspace/{id}` | Desk wake runs; orchestrator chat loads |
| 7 | Send a shell command that needs approval | Approval card appears; allow runs on Orgo or sandbox |

## API spot checks (authenticated)

```bash
# Session
curl -b cookies.txt https://cnstrct-mu.vercel.app/api/session

# Provision summary (owner)
curl -b cookies.txt https://cnstrct-mu.vercel.app/api/businesses/{id}/provision

# Worker (cron only)
curl -H "Authorization: Bearer $CRON_SECRET" https://cnstrct-mu.vercel.app/api/cron/provisioning
```

## Sign-off

Record date, operator, and business id in the BizOS tracker. Attach an optional screenshot to Project `media/` when validating Orgo desk visuals.