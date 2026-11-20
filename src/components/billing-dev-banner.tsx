import { billingPublicState } from "@/lib/billing/policy";

export function BillingDevBanner() {
  const state = billingPublicState();
  if (!state.devBypassActive) return null;
  return (
    <div
      className="border-b border-sky-500/30 bg-sky-500/10 px-4 py-2.5 text-center text-sm text-foreground"
      role="status"
    >
      <p>
        <span className="font-medium">Billing bypass active</span> ({state.deployment} deployment, mode{" "}
        {state.billingMode}). Construction works without Stripe for fast dev. Questionnaire and path recommendations stay
        free. Production always enforces paid plans. Set <code className="text-xs">BILLING_MODE=enforce</code> locally to
        test checkout.
      </p>
    </div>
  );
}