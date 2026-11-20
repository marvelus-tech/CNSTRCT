import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { verifyWebhookEvent } from "@/lib/billing/stripe-server";
import { upsertEntitlement } from "@/lib/billing/entitlements";
import type { PlanId } from "@/lib/billing/plans";
import { planFromId } from "@/lib/billing/plans";

export const runtime = "nodejs";

function planFromMetadata(metadata: Stripe.Metadata | null | undefined, subscription?: Stripe.Subscription): PlanId | null {
  const raw = metadata?.planId ?? subscription?.metadata?.planId;
  return planFromId(raw)?.id ?? null;
}

function periodEnd(subscription: Stripe.Subscription | null | undefined) {
  const end = subscription?.items?.data[0]?.current_period_end;
  return end ? end * 1000 : null;
}

async function applySubscription(userId: string, planId: PlanId, subscription: Stripe.Subscription) {
  upsertEntitlement({
    userId,
    planId,
    status: subscription.status === "active" || subscription.status === "trialing" ? "active" : "canceled",
    stripeCustomerId: typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id,
    stripeSubscriptionId: subscription.id,
    currentPeriodEnd: periodEnd(subscription),
  });
}

export async function POST(request: Request) {
  const payload = await request.text();
  const signature = request.headers.get("stripe-signature") ?? "";
  const verified = verifyWebhookEvent(payload, signature);
  if (!verified.ok) {
    return NextResponse.json({ error: verified.error }, { status: verified.error.includes("not configured") ? 503 : 400 });
  }

  const event = verified.event;
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const planId = planFromMetadata(session.metadata);
      if (!userId || !planId) break;
      if (session.mode !== "subscription") break;
      const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
      upsertEntitlement({
        userId,
        planId,
        status: "active",
        stripeCustomerId: typeof session.customer === "string" ? session.customer : session.customer?.id,
        stripeSubscriptionId: subscriptionId ?? null,
        currentPeriodEnd: session.expires_at ? session.expires_at * 1000 : null,
      });
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.userId;
      const planId = planFromMetadata(subscription.metadata, subscription);
      if (!userId || !planId) break;
      await applySubscription(userId, planId, subscription);
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}