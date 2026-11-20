import Stripe from "stripe";
import { paymentsConfigured, stripePriceId, stripeSecretKey } from "./config";
import { siteUrl } from "../seo";
import type { PlanId } from "./plans";

export function stripeClient() {
  if (!paymentsConfigured()) return null;
  return new Stripe(stripeSecretKey());
}

export async function createCheckoutSession(input: { userId: string; userEmail: string; planId: PlanId; returnPath: string }) {
  const stripe = stripeClient();
  if (!stripe) return { ok: false as const, error: "Payments are not configured yet." };
  const price = stripePriceId(input.planId);
  const origin = siteUrl();
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: input.userEmail,
    line_items: [{ price, quantity: 1 }],
    success_url: `${origin}${input.returnPath}${input.returnPath.includes("?") ? "&" : "?"}checkout=success`,
    cancel_url: `${origin}/checkout?plan=${input.planId}&canceled=1`,
    metadata: {
      userId: input.userId,
      planId: input.planId,
    },
    subscription_data: {
      metadata: {
        userId: input.userId,
        planId: input.planId,
      },
    },
  });
  if (!session.url) return { ok: false as const, error: "Stripe did not return a checkout URL." };
  return { ok: true as const, url: session.url, sessionId: session.id };
}

export function verifyWebhookEvent(payload: string, signature: string) {
  const stripe = stripeClient();
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!stripe || !secret) return { ok: false as const, error: "Payments are not configured yet." };
  try {
    const event = stripe.webhooks.constructEvent(payload, signature, secret);
    return { ok: true as const, event };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid webhook signature";
    return { ok: false as const, error: message };
  }
}