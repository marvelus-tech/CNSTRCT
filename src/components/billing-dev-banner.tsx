import { billingPublicState } from "@/lib/billing/policy";

export function BillingDevBanner() {
  const state = billingPublicState();
  if (!state.devBypassActive) return null;

  if (state.stripePending) {
    return (
      <div
        className="border-b border-amber-500/25 bg-amber-500/10 px-4 py-2.5 text-center text-sm text-foreground"
        role="status"
      >
        <p>
          <span className="font-medium">Billing activates soon.</span> You can still complete triage, see path
          recommendations, and construct your business. Paid plans will appear here once Stripe is configured.
        </p>
      </div>
    );
  }

  return (
    <div
      className="border-b border-sky-500/30 bg-sky-500/10 px-4 py-2.5 text-center text-sm text-foreground"
      role="status"
    >
      <p>
        <span className="font-medium">Billing test bypass</span> ({state.deployment}). Stripe is configured but this
        environment skips the paywall. Set <code className="text-xs">BILLING_MODE=enforce</code> to exercise Checkout.
      </p>
    </div>
  );
}