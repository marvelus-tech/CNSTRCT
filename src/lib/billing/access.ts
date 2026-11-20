import { billingTestModeEnabled, paymentsConfigured } from "./config";
import { businessLimitForUser, getEntitlement } from "./entitlements";
import type { PlanId } from "./plans";

export type ConstructionAccess =
  | { ok: true; planId: PlanId }
  | { ok: false; status: number; code: string; error: string };

export function constructionAccess(userId: string): ConstructionAccess {
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
          ? "Starter includes one business. Upgrade to Pro for up to three."
          : "You reached the business limit on your plan.",
    };
  }

  return { ok: true, planId: entitlement.planId };
}