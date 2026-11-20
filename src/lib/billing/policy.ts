/** Server-only billing policy (import from API routes and server components only). */
import { billingTestModeEnabled, paymentsConfigured } from "./config";

export type BillingMode = "enforce" | "bypass";
export type BillingDeployment = "production" | "preview" | "development";

/** Where this Node process is running. Request headers/cookies never influence billing. */
export function billingDeployment(): BillingDeployment {
  const vercel = process.env.VERCEL_ENV?.trim();
  if (vercel === "production") return "production";
  if (vercel === "preview") return "preview";
  return "development";
}

export function isBillingProduction(): boolean {
  return billingDeployment() === "production";
}

function billingModeEnv(): BillingMode | null {
  const raw = process.env.BILLING_MODE?.trim().toLowerCase();
  if (raw === "enforce") return "enforce";
  if (raw === "bypass") return "bypass";
  return null;
}

/**
 * Server-only billing mode. Production is always enforce (ignores BILLING_MODE=bypass).
 * Local/preview: explicit BILLING_MODE wins; otherwise bypass when Stripe is not configured (dev-friendly), else enforce.
 */
export function effectiveBillingMode(): BillingMode {
  if (isBillingProduction()) return "enforce";
  const fromEnv = billingModeEnv();
  if (fromEnv) return fromEnv;
  if (!paymentsConfigured()) return "bypass";
  return "enforce";
}

/** True when construction may proceed without Stripe entitlement (never on production). */
export function billingDevBypassActive(): boolean {
  if (billingTestModeEnabled()) return false;
  if (isBillingProduction()) return false;
  return effectiveBillingMode() === "bypass";
}

export function billingPaywallEnforced(): boolean {
  return !billingDevBypassActive();
}

/** Safe for API/UI: no secrets, not client-spoofable (derived from server env only). */
export function billingPublicState() {
  const devBypassActive = billingDevBypassActive();
  return {
    deployment: billingDeployment(),
    billingMode: effectiveBillingMode(),
    paywallEnforced: billingPaywallEnforced(),
    devBypassActive,
    paymentsConfigured: paymentsConfigured(),
  };
}