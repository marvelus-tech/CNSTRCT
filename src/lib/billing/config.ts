export function stripeSecretKey() {
  return process.env.STRIPE_SECRET_KEY?.trim() || "";
}

export function stripeWebhookSecret() {
  return process.env.STRIPE_WEBHOOK_SECRET?.trim() || "";
}

export function stripePriceId(plan: "starter" | "pro") {
  const key = plan === "starter" ? "STRIPE_PRICE_STARTER" : "STRIPE_PRICE_PRO";
  return process.env[key]?.trim() || "";
}

/** Live Stripe Checkout is available when secret key and both price IDs are set. */
export function paymentsConfigured() {
  return Boolean(stripeSecretKey() && stripePriceId("starter") && stripePriceId("pro"));
}

/** Test-only bypass for granting entitlements in node:test. Never honored outside NODE_ENV=test. */
export function billingTestModeEnabled() {
  return process.env.NODE_ENV === "test" && process.env.BILLING_TEST_MODE === "true";
}