import type { PlanId } from "./plans";

export function stripeSecretKey() {
  return process.env.STRIPE_SECRET_KEY?.trim() || "";
}

export function stripeWebhookSecret() {
  return process.env.STRIPE_WEBHOOK_SECRET?.trim() || "";
}

const STRIPE_PRICE_ENV: Record<PlanId, string> = {
  starter: "STRIPE_PRICE_STARTER",
  pro: "STRIPE_PRICE_PRO",
  scale: "STRIPE_PRICE_SCALE",
};

export function stripePriceId(plan: PlanId) {
  return process.env[STRIPE_PRICE_ENV[plan]]?.trim() || "";
}

/** Live Stripe Checkout is available when secret key and all plan price IDs are set. */
export function paymentsConfigured() {
  return Boolean(
    stripeSecretKey() &&
      stripePriceId("starter") &&
      stripePriceId("pro") &&
      stripePriceId("scale"),
  );
}

/** Test-only bypass for granting entitlements in node:test. Never honored outside NODE_ENV=test. */
export function billingTestModeEnabled() {
  return process.env.NODE_ENV === "test" && process.env.BILLING_TEST_MODE === "true";
}