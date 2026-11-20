# BizOS billing (Stripe)

Construction (`POST /api/business`) requires an active subscription entitlement **when the paywall is enforced**. Triage, opportunity preview, and signed-in recommendations stay free.

Paywall decisions are made in **`src/lib/billing/policy.ts`** (server env only). No header, cookie, or query string can bypass billing.

## Environment behavior

| Deployment | `VERCEL_ENV` | `BILLING_MODE` | Stripe keys | Construction |
| --- | --- | --- | --- | --- |
| **Vercel production** | `production` | ignored (`enforce` always) | missing | **503** `payments_not_configured` |
| **Vercel production** | `production` | ignored | set, no entitlement | **402** `payment_required` |
| **Vercel production** | `production` | ignored | set, active entitlement | **200** (plan limits apply) |
| **Vercel preview** | `preview` | unset, Stripe unset | missing | **Bypass** (default dev-friendly) |
| **Vercel preview** | `preview` | `bypass` | set or unset | **Bypass** |
| **Vercel preview** | `preview` | `enforce` | set, no entitlement | **402** |
| **Local dev** | unset | unset, Stripe unset | missing | **Bypass** (default) |
| **Local dev** | unset | `bypass` | set | **Bypass** |
| **Local dev** | unset | `enforce` | set | Enforced (needs entitlement) |
| **Local dev** | unset | `enforce` | missing | **503** |

**`BILLING_MODE=bypass` on production is never honored.**

### Defaults (when `BILLING_MODE` is unset)

- **Production:** always **enforce**.
- **Local / preview:** **bypass** if Stripe is not fully configured; otherwise **enforce** (so you can test Checkout when keys exist).

Set `BILLING_MODE=enforce` locally to exercise the paywall even without Stripe keys (expect **503**).

### UI signal

When bypass is active (non-production only), a sky **Billing bypass active** banner appears (from `billingPublicState()`). `GET /api/billing/status` exposes `devBypassActive`, `paywallEnforced`, `deployment`, and `billingMode` (non-secret).

### Dev bypass limits

Bypass grants **Pro-style construction access** (up to **3 businesses**) without Stripe. Still enforced server-side on `POST /api/business`.

## Stripe variables

| Variable | Purpose |
| --- | --- |
| `STRIPE_SECRET_KEY` | Stripe API secret (`sk_live_...` or `sk_test_...`) |
| `STRIPE_PRICE_STARTER` | Price ID for Starter ($39/mo) |
| `STRIPE_PRICE_PRO` | Price ID for Pro ($79/mo) |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for `POST /api/billing/webhook` |
| `NEXT_PUBLIC_SITE_URL` | Public origin for Checkout success/cancel URLs |
| `BILLING_MODE` | `enforce` or `bypass` (non-production only; see table above) |

## Webhook setup

1. In Stripe Dashboard → Developers → Webhooks, add endpoint: `https://<your-host>/api/billing/webhook`
2. Listen for: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
3. Copy the signing secret into `STRIPE_WEBHOOK_SECRET`
4. Subscription metadata includes `userId` and `planId` (set at Checkout creation)

## Test mode ergonomics

`node:test` only:

- `NODE_ENV=test` and `BILLING_TEST_MODE=true` disable dev bypass and allow `grantTestEntitlement()` without Stripe.
- Never set `BILLING_TEST_MODE` outside tests.

## Plans (product copy)

- **Starter**: $39/mo, 1 business, 3 agents, 400k credits, 4 computer hours
- **Pro**: $79/mo, up to 3 businesses, 1.2M credits, 12 computer hours
- Overage: $12 per 100k credits, $4 per extra computer hour (messaging only in MVP; metered billing TBD)