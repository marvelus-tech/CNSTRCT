import { NextResponse } from "next/server";
import { businessLimitForUser } from "@/lib/billing/entitlements";
import { paymentsConfigured } from "@/lib/billing/config";
import { currentUser } from "@/lib/session";
import { getEntitlement } from "@/lib/billing/entitlements";
import { PLANS } from "@/lib/billing/plans";

export const runtime = "nodejs";

export async function GET() {
  const configured = paymentsConfigured();
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({
      configured,
      signedIn: false,
      entitled: false,
      paymentsMessage: configured ? null : "Payments are not configured yet.",
    });
  }
  const entitlement = getEntitlement(user.id);
  const limits = businessLimitForUser(user.id);
  const plan = entitlement ? PLANS[entitlement.planId] : null;
  return NextResponse.json({
    configured,
    signedIn: true,
    entitled: Boolean(entitlement),
    planId: entitlement?.planId ?? null,
    businessCount: limits.used,
    businessLimit: limits.max,
    tokenCredits: plan?.tokenCredits ?? null,
    computerHours: plan?.computerHours ?? null,
    paymentsMessage: configured ? null : "Payments are not configured yet.",
  });
}