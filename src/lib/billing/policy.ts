/** Server-only billing policy (import from API routes and server components only). */
import { billingTestModeEnabled, paymentsConfigured } from "./config";

export type BillingMode = "enforce" | "bypass" | "pending";

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

function billingModeEnv(): "enforce" | "bypass" | null {
  const raw = process.env.BILLING_MODE?.trim().toLowerCase();
  if (raw === "enforce") return "enforce";
  if (raw === "bypass") return "bypass";
  return null;
}

/** Stripe keys/prices are not set yet (launch mode). */
export function billingStripePending(): boolean {
  if (billingTestModeEnabled()) return false;
  return !paymentsConfigured();
}

/**
 * When construction is allowed without a paid Stripe entitlement.
 * - Stripe not configured: always (including production) until billing is wired.
 * - Stripe configured on production: never bypass unpaid users.
 * - Stripe configured on local/preview: only with BILLING_MODE=bypass.
 */
export function billingConstructionBypassActive(): boolean {
  if (billingTestModeEnabled()) return false;
  if (billingStripePending()) return true;
  if (isBillingProduction()) return false;
  return billingModeEnv() === "bypass";
}

/** @deprecated Use billingConstructionBypassActive; kept for API field name `devBypassActive`. */
export function billingDevBypassActive(): boolean {
  return billingConstructionBypassActive();
}

export function billingPaywallEnforced(): boolean {
  return !billingConstructionBypassActive();
}

/** Display mode for status API (not used for security decisions). */
export function effectiveBillingMode(): BillingMode {
  if (billingStripePending()) return "pending";
  if (isBillingProduction()) return "enforce";
  const fromEnv = billingModeEnv();
  if (fromEnv) return fromEnv;
  return "enforce";
}

/** Safe for API/UI: no secrets, not client-spoofable (derived from server env only). */
export function billingPublicState() {
  const constructionBypass = billingConstructionBypassActive();
  const stripePending = billingStripePending();
  return {
    deployment: billingDeployment(),
    billingMode: effectiveBillingMode(),
    paywallEnforced: billingPaywallEnforced(),
    devBypassActive: constructionBypass,
    stripePending,
    paymentsConfigured: paymentsConfigured(),
  };
}