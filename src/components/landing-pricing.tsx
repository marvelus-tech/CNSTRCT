import Link from "next/link";
import { LandingSection } from "@/components/landing-section";
import { Button } from "@/components/ui/button";
import { LANDING_PLAN_ORDER, landingDigitalWorkersCopy, OVERAGE_COPY, PLANS } from "@/lib/billing/plans";

export function LandingPricing() {
  return (
    <LandingSection aria-label="BizOS pricing">
      <h2 className="landing-section-title">Funding your Biz</h2>
      <p className="landing-section-lead mt-2 max-w-2xl">
        Questionnaire free. You pay when BizOS spins up your bots and desk.
      </p>
      <ul className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {LANDING_PLAN_ORDER.map((id) => {
          const plan = PLANS[id];
          return (
            <li key={plan.id} className="flex flex-col border border-border bg-background p-6">
              <p className="landing-eyebrow text-accent">{plan.label}</p>
              <p className="mt-2 text-4xl font-semibold tabular-nums tracking-tight">
                ${plan.priceUsd}
                <span className="text-base font-normal text-muted">/mo</span>
              </p>
              <ul className="landing-section-lead mt-4 space-y-2">
                <li>{plan.maxBusinesses === 1 ? "1 business" : `Up to ${plan.maxBusinesses} businesses`}</li>
                <li>{landingDigitalWorkersCopy(plan)}</li>
                <li>{(plan.tokenCredits / 1000).toLocaleString()}k included work credits / month</li>
                <li>{plan.computerHours} specialist computer hours / month</li>
              </ul>
              <div className="mt-6">
                <Button className="w-full sm:w-auto" asChild>
                  <Link href={`/checkout?plan=${plan.id}`}>Choose {plan.label}</Link>
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="landing-fine-print mt-6 max-w-3xl">{OVERAGE_COPY}</p>
    </LandingSection>
  );
}