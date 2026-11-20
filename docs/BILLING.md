# BizOS billing (Stripe)

Construction (`POST /api/business`) requires an active subscription entitlement. Triage, opportunity preview, and signed-in recommendations stay free.

## Required environment variables

Set these in production (and `.env.local` for local Stripe testing):

| Variable | Purpose |
| --- | --- |
| `STRIPE_SECRET_KEY` | Stripe API secret (`sk_live_...` or `sk_test_...`) |
| `STRIPE_PRICE_STARTER` | Price ID for Starter ($39/mo) |
| `STRIPE_PRICE_PRO` | Price ID for Pro ($79/mo) |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for `POST /api/billing/webhook` |
| `NEXT_PUBLIC_SITE_URL` | Public origin for Checkout success/cancel URLs |

Until `STRIPE_SECRET_KEY` and both price IDs are set, `paymentsConfigured()` is false. The app returns **503** with `Payments are not configured yet.` on checkout and construction. There is no production bypass.

## Webhook setup

1. In Stripe Dashboard → Developers → Webhooks, add endpoint: `https://<your-host>/api/billing/webhook`
2. Listen for: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
3. Copy the signing secret into `STRIPE_WEBHOOK_SECRET`
4. Subscription metadata includes `userId` and `planId` (set at Checkout creation)

## Test mode ergonomics

`node:test` only:

- `NODE_ENV=test` and `BILLING_TEST_MODE=true` allow `grantTestEntitlement()` in tests without Stripe keys.
- Never set `BILLING_TEST_MODE` outside tests.

## Plans (product copy)

- **Starter**: $39/mo, 1 business, 3 agents, 400k credits, 4 computer hours
- **Pro**: $79/mo, up to 3 businesses, 1.2M credits, 12 computer hours
- Overage: $12 per 100k credits, $4 per extra computer hour (messaging only in MVP; metered billing TBD)