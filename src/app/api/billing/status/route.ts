import { NextResponse } from "next/server";
import { businessLimitForUser } from "@/lib/billing/entitlements";
import { paymentsConfigured } from "@/lib/billing/config";
import { billingPublicState } from "@/lib/billing/policy";
import { currentUser } from "@/lib/session";
import { getEntitlement } from "@/lib/billing/entitlements";
import { PLANS } from "@/lib/billing/plans";

export const runtime = "nodejs";

export async function GET() {
  const configured = paymentsConfigured();
  const billing = billingPublicState();
  const paymentsMessage =
    billing.devBypassActive || configured ? null : "Payments are not configured yet.";
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({
      ...billing,
      configured,
      signedIn: false,
      entitled: false,
      canConstructWithoutPayment: billing.devBypassActive,
      paymentsMessage,
    });
  }
  const entitlement = getEntitlement(user.id);
  const limits = businessLimitForUser(user.id);
  const plan = entitlement ? PLANS[entitlement.planId] : null;
  const entitled = Boolean(entitlement) || billing.devBypassActive;
  return NextResponse.json({
    ...billing,
    configured,
    signedIn: true,
    entitled,
    canConstructWithoutPayment: billing.devBypassActive,
    planId: entitlement?.planId ?? (billing.devBypassActive ? "pro" : null),
    businessCount: limits.used,
    businessLimit: billing.devBypassActive ? PLANS.pro.maxBusinesses : limits.max,
    tokenCredits: plan?.tokenCredits ?? (billing.devBypassActive ? PLANS.pro.tokenCredits : null),
    computerHours: plan?.computerHours ?? (billing.devBypassActive ? PLANS.pro.computerHours : null),
    paymentsMessage,
  });
}