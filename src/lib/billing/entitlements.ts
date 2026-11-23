import { getDb } from "../db";
import { listBusinessesForUser } from "../store";
import type { PlanId } from "./plans";
import { PLANS, planFromId } from "./plans";
import { billingTestModeEnabled } from "./config";

export type EntitlementRow = {
  userId: string;
  planId: PlanId;
  status: "active" | "canceled";
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  currentPeriodEnd: number | null;
  updatedAt: number;
};

function mapRow(row: Record<string, unknown>): EntitlementRow {
  return {
    userId: String(row.user_id),
    planId: String(row.plan_id) as PlanId,
    status: String(row.status) as EntitlementRow["status"],
    stripeCustomerId: row.stripe_customer_id == null ? null : String(row.stripe_customer_id),
    stripeSubscriptionId: row.stripe_subscription_id == null ? null : String(row.stripe_subscription_id),
    currentPeriodEnd: row.current_period_end == null ? null : Number(row.current_period_end),
    updatedAt: Number(row.updated_at),
  };
}

export async function getEntitlement(userId: string): Promise<EntitlementRow | null> {
  const row = await (await (await getDb()).prepare("SELECT * FROM billing_entitlements WHERE user_id = ?").get(userId)) as
    | Record<string, unknown>
    | undefined;
  if (!row) return null;
  const mapped = mapRow(row);
  if (mapped.status !== "active") return null;
  if (mapped.currentPeriodEnd && mapped.currentPeriodEnd < Date.now()) return null;
  return mapped;
}

export async function upsertEntitlement(input: {
  userId: string;
  planId: PlanId;
  status?: EntitlementRow["status"];
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  currentPeriodEnd?: number | null;
}) {
  const now = Date.now();
  await (await getDb())
    .prepare(
      `INSERT INTO billing_entitlements (user_id, plan_id, status, stripe_customer_id, stripe_subscription_id, current_period_end, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         plan_id = excluded.plan_id,
         status = excluded.status,
         stripe_customer_id = COALESCE(excluded.stripe_customer_id, billing_entitlements.stripe_customer_id),
         stripe_subscription_id = COALESCE(excluded.stripe_subscription_id, billing_entitlements.stripe_subscription_id),
         current_period_end = excluded.current_period_end,
         updated_at = excluded.updated_at`,
    )
    .run(
      input.userId,
      input.planId,
      input.status ?? "active",
      input.stripeCustomerId ?? null,
      input.stripeSubscriptionId ?? null,
      input.currentPeriodEnd ?? null,
      now,
    );
}

/** Test harness only. Throws if not in billing test mode. */
export async function grantTestEntitlement(userId: string, planId: PlanId) {
  if (!billingTestModeEnabled()) {
    throw new Error("grantTestEntitlement is only available in BILLING_TEST_MODE tests.");
  }
  const periodEnd = Date.now() + 30 * 24 * 60 * 60 * 1000;
  await upsertEntitlement({
    userId,
    planId,
    status: "active",
    currentPeriodEnd: periodEnd,
    stripeCustomerId: "test_customer",
    stripeSubscriptionId: "test_sub",
  });
}

export async function businessLimitForUser(userId: string): Promise<{ plan: PlanId | null; max: number; used: number; allowed: boolean }> {
  const entitlement = await getEntitlement(userId);
  if (!entitlement) {
    return { plan: null, max: 0, used: (await listBusinessesForUser(userId)).length, allowed: false };
  }
  const plan = planFromId(entitlement.planId);
  if (!plan) return { plan: null, max: 0, used: 0, allowed: false };
  const used = (await listBusinessesForUser(userId)).length;
  return { plan: plan.id, max: plan.maxBusinesses, used, allowed: used < plan.maxBusinesses };
}

export async function planLimitsForUser(userId: string) {
  const entitlement = await getEntitlement(userId);
  if (!entitlement) return null;
  return PLANS[entitlement.planId];
}