import { FoundingTeamCluster } from "@/components/founding-team-cluster";
import { LandingSection } from "@/components/landing-section";

export function LandingFoundingTeam() {
  return (
    <LandingSection variant="default" aria-label="Founding team on your desk">
      <div className="grid items-center gap-10 md:grid-cols-2 md:gap-12">
        <div className="rise">
          <p className="landing-eyebrow">Founding team</p>
          <h2 className="landing-section-title mt-2">They start before you ask.</h2>
          <p className="landing-section-lead mt-4 max-w-lg">
            Three teammates on your desk. They run the next task. You approve what ships.
          </p>
        </div>
        <div className="rise w-full md:justify-self-end">
          <FoundingTeamCluster />
        </div>
      </div>
    </LandingSection>
  );
}