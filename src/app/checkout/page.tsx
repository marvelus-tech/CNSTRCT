"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/wordmark";
import { LANDING_PLAN_ORDER, landingDigitalWorkersCopy, PLANS, planFromId, type PlanId } from "@/lib/billing/plans";

type BillingStatus = {
  configured: boolean;
  signedIn: boolean;
  entitled: boolean;
  paymentsMessage: string | null;
};

function CheckoutInner() {
  const router = useRouter();
  const params = useSearchParams();
  const planParam = params.get("plan");
  const next = params.get("next") || "/opportunities";
  const canceled = params.get("canceled") === "1";
  const planId = (planFromId(planParam)?.id ?? "starter") as PlanId;
  const plan = PLANS[planId];
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/billing/status");
      const json = (await res.json()) as BillingStatus;
      setStatus(json);
      if (!json.signedIn) {
        router.replace(`/login?next=${encodeURIComponent(`/checkout?plan=${planId}&next=${encodeURIComponent(next)}`)}`);
      } else if (json.entitled) {
        router.replace(next.startsWith("/") ? next : "/opportunities");
      }
    })();
  }, [router, planId, next]);

  async function startCheckout() {
    setLoading(true);
    setError("");
    const response = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId, returnPath: next }),
    });
    const json = (await response.json()) as { url?: string; error?: string };
    setLoading(false);
    if (!response.ok || !json.url) {
      setError(json.error || "Checkout could not start.");
      return;
    }
    window.location.href = json.url;
  }

  return (
    <div className="min-h-full bg-background">
      <header className="flex items-center justify-between px-5 py-4 md:px-10">
        <Wordmark />
        <Link href="/" className="text-sm text-muted">
          Home
        </Link>
      </header>
      <main className="mx-auto max-w-lg px-5 pb-16 pt-12">
        <p className="text-sm font-medium text-accent">Checkout</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Choose {plan.label}</h1>
        <p className="mt-3 text-muted">
          Triage and path recommendations stay free. A paid plan unlocks constructing your desk with your founding bots.
        </p>
        <div className="mt-8 border border-border bg-card p-6" aria-label="Plan summary">
          <p className="text-4xl font-semibold tabular-nums">
            ${plan.priceUsd}
            <span className="text-base font-normal text-muted">/mo</span>
          </p>
          <ul className="mt-4 space-y-2 text-sm text-muted">
            <li>{plan.maxBusinesses === 1 ? "1 business" : `Up to ${plan.maxBusinesses} businesses`}</li>
            <li>{landingDigitalWorkersCopy(plan)}</li>
            <li>{(plan.tokenCredits / 1000).toLocaleString()}k included credits / month</li>
            <li>{plan.computerHours} computer hours / month</li>
          </ul>
          <div className="mt-6 flex flex-col gap-3">
            <Button disabled={loading || !status?.configured} onClick={() => void startCheckout()} className="w-full">
              {loading ? "Opening Stripe…" : "Pay with Stripe"}
            </Button>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap" role="group" aria-label="Other plans">
              {LANDING_PLAN_ORDER.filter((id) => id !== planId).map((id) => (
                <Button key={id} variant="outline" asChild className="flex-1 min-w-[7rem]">
                  <Link href={`/checkout?plan=${id}&next=${encodeURIComponent(next)}`}>View {PLANS[id].label}</Link>
                </Button>
              ))}
            </div>
          </div>
        </div>
        {!status?.configured ? (
          <p className="mt-6 text-sm text-danger">{status?.paymentsMessage ?? "Payments are not configured yet."}</p>
        ) : null}
        {canceled ? <p className="mt-4 text-sm text-muted">Checkout canceled. Pick a plan when you are ready.</p> : null}
        {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}
        <p className="mt-8 text-xs text-muted">
          Usage is metered after included credits and computer hours. See landing pricing for overage rates.
        </p>
      </main>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="min-h-full bg-background" />}>
      <CheckoutInner />
    </Suspense>
  );
}