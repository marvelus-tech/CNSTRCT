import { LandingConnectorsOrbit } from "@/components/landing-connectors-orbit";
import { LandingSection } from "@/components/landing-section";

const CONNECTORS_HEADLINE = "All your favorite tools, accessible to your new business.";

export function LandingConnectors() {
  return (
    <LandingSection
      aria-label="Integrations with popular business tools"
      className="[&>div]:max-w-6xl"
    >
      <div className="flex flex-col items-center gap-8 md:gap-10">
        <h2 className="landing-section-title mx-auto max-w-3xl text-center text-pretty">
          {CONNECTORS_HEADLINE}
        </h2>
        <div className="connectors-orbit-layout w-full">
          <LandingConnectorsOrbit />
        </div>
      </div>
    </LandingSection>
  );
}