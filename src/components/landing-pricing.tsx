import Link from "next/link";
import { Button } from "@/components/ui/button";
import { OVERAGE_COPY, PLANS } from "@/lib/billing/plans";

const cards = [PLANS.starter, PLANS.pro];

export function LandingPricing() {
  return (
    <section aria-label="BizOS pricing" className="border-y border-border bg-background px-5 py-12 md:px-10 md:py-14">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">Plans to construct your desk</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          The questionnaire and path recommendations stay free. Constructing a digital business with Quinn and two specialists
          requires a paid plan.
        </p>
        <ul className="mt-8 grid gap-4 md:grid-cols-2">
          {cards.map((plan) => (
            <li key={plan.id} className="flex flex-col border border-border bg-card p-6">
              <p className="text-sm font-medium text-accent">{plan.label}</p>
              <p className="mt-2 text-4xl font-semibold tabular-nums tracking-tight">
                ${plan.priceUsd}
                <span className="text-base font-normal text-muted"> USD/mo</span>
              </p>
              <ul className="mt-4 space-y-2 text-sm text-muted">
                <li>
                  {plan.maxBusinesses === 1 ? "1 business" : `Up to ${plan.maxBusinesses} businesses`}
                </li>
                <li>{plan.agentCount} agents (Quinn + 2 specialists)</li>
                <li>{(plan.tokenCredits / 1000).toLocaleString()}k included agent-work credits / month</li>
                <li>{plan.computerHours} specialist computer hours / month</li>
              </ul>
              <div className="mt-6">
                <Button className="w-full sm:w-auto" asChild>
                  <Link href={`/checkout?plan=${plan.id}`}>Choose {plan.label}</Link>
                </Button>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-6 max-w-3xl text-xs leading-relaxed text-muted">{OVERAGE_COPY}</p>
      </div>
    </section>
  );
}