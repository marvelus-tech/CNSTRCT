import { NextResponse } from "next/server";
import { createCheckoutSession } from "@/lib/billing/stripe-server";
import { paymentsConfigured } from "@/lib/billing/config";
import { planFromId } from "@/lib/billing/plans";
import { currentUser } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!paymentsConfigured()) {
    return NextResponse.json({ error: "Payments are not configured yet." }, { status: 503 });
  }
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const body = (await request.json()) as { planId?: string; returnPath?: string };
  const plan = planFromId(body.planId);
  if (!plan) return NextResponse.json({ error: "Pick a plan." }, { status: 400 });
  const returnPath = body.returnPath?.startsWith("/") ? body.returnPath : "/opportunities";
  const session = await createCheckoutSession({
    userId: user.id,
    userEmail: user.email,
    planId: plan.id,
    returnPath,
  });
  if (!session.ok) return NextResponse.json({ error: session.error }, { status: 503 });
  return NextResponse.json({ url: session.url });
}