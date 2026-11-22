import { billingTestModeEnabled, paymentsConfigured } from "./config";
import { businessLimitForUser, getEntitlement } from "./entitlements";
import { listBusinessesForUser } from "../store";
import { billingConstructionBypassActive } from "./policy";
import type { PlanId } from "./plans";
import { PLANS } from "./plans";

export type ConstructionAccess =
  | { ok: true; planId: PlanId }
  | { ok: false; status: number; code: string; error: string };

export function constructionAccess(userId: string): ConstructionAccess {
  if (billingConstructionBypassActive()) {
    const used = listBusinessesForUser(userId).length;
    const max = PLANS.pro.maxBusinesses;
    if (used >= max) {
      return {
        ok: false,
        status: 403,
        code: "plan_limit",
        error: "Dev bypass allows up to three businesses (Pro limit). Delete one or set BILLING_MODE=enforce to test plan limits.",
      };
    }
    return { ok: true, planId: "pro" };
  }

  if (!paymentsConfigured() && !billingTestModeEnabled()) {
    return {
      ok: false,
      status: 503,
      code: "payments_not_configured",
      error: "Payments are not configured yet. Constructing a business is unavailable until billing is set up.",
    };
  }

  const entitlement = getEntitlement(userId);
  if (!entitlement) {
    return {
      ok: false,
      status: 402,
      code: "payment_required",
      error: "Choose a paid plan before you construct a business.",
    };
  }

  const limit = businessLimitForUser(userId);
  if (!limit.allowed) {
    return {
      ok: false,
      status: 403,
      code: "plan_limit",
      error:
        limit.plan === "starter"
          ? "Starter includes one business. Upgrade to Pro or Scale for more."
          : limit.plan === "pro"
            ? "Pro includes up to three businesses. Upgrade to Scale for up to ten."
            : "You reached the business limit on your Scale plan (ten businesses).",
    };
  }

  return { ok: true, planId: entitlement.planId };
}