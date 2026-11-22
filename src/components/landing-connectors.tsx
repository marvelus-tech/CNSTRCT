import { LandingConnectorsOrbit } from "@/components/landing-connectors-orbit";
import { LandingSection } from "@/components/landing-section";

export function LandingConnectors() {
  return (
    <LandingSection
      variant="card"
      aria-label="Integrations with popular business tools"
      className="[&>div]:max-w-6xl"
    >
      <div className="grid gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] md:items-center md:gap-12">
        <div>
          <p className="landing-eyebrow">Integrations</p>
          <h2 className="landing-section-title mt-3 max-w-xl">
            Your favorite tools, wired to your business.
          </h2>
          <p className="landing-section-lead mt-4 max-w-lg">
            Slack, Gmail, GitHub, Notion, and the apps you already use. Connected so your bots
            can act, not just chat.
          </p>
          <p className="landing-fine-print mt-5 max-w-lg text-muted">
            Thousands of apps supported through your connected stack.
          </p>
        </div>
        <div className="w-full md:justify-self-end">
          <LandingConnectorsOrbit />
        </div>
      </div>
    </LandingSection>
  );
}