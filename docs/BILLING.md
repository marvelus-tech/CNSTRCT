# BizOS billing (Stripe)

Construction (`POST /api/business`) requires a paid entitlement **only when Stripe is fully configured** and the paywall is enforced. Triage and opportunity preview stay free.

Paywall decisions live in **`src/lib/billing/policy.ts`** (server env only). Headers, cookies, and query strings cannot change billing.

## Launch mode (Stripe not configured)

When `paymentsConfigured()` is false (missing secret key or either price ID):

- Construction is **allowed** on local, preview, and **production** (no 503, no checkout required).
- A site banner shows: **Billing activates soon.** (non-alarming).
- Set Stripe env vars when ready; once all three are present, unpaid users on production must choose a plan.

## When Stripe is configured

| Deployment | `BILLING_MODE` | Unpaid user |
| --- | --- | --- |
| **Production** | ignored | **402** `payment_required` |
| **Production** | entitled | Construct (plan limits) |
| **Preview / local** | `bypass` | Construct (dev test bypass banner) |
| **Preview / local** | `enforce` or unset | **402** unless entitled |

`BILLING_MODE=bypass` on production **does not** bypass unpaid users when Stripe is configured.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `STRIPE_SECRET_KEY` | Server Stripe client |
| `STRIPE_PRICE_STARTER` | Starter price ID |
| `STRIPE_PRICE_PRO` | Pro price ID |
| `STRIPE_WEBHOOK_SECRET` | Webhook signature (entitlements after pay) |
| `NEXT_PUBLIC_SITE_URL` | Checkout return URLs |
| `BILLING_MODE` | `enforce` or `bypass` on non-production when Stripe is configured |

## Webhook setup

1. Endpoint: `https://<your-host>/api/billing/webhook`
2. Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
3. Set `STRIPE_WEBHOOK_SECRET`

## Tests

`BILLING_TEST_MODE=true` with `NODE_ENV=test` disables launch bypass and uses `grantTestEntitlement()` for paid-path tests.