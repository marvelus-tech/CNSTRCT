import { FoundingTeamCluster } from "@/components/founding-team-cluster";
import { LandingSection } from "@/components/landing-section";

const STEPS = [
  {
    title: "Take the questionnaire",
    body: "Our matching engine pairs you with a business built for your interests and situation.",
  },
  {
    title: "Start your business",
    body: "Your founding team starts working automatically. You approve what ships.",
  },
] as const;

export function LandingFoundingTeam() {
  return (
    <LandingSection variant="default" aria-label="How BizOS works">
      <div className="grid items-center gap-10 md:grid-cols-2 md:gap-12">
        <div className="rise">
          <p className="landing-eyebrow">How it works</p>
          <h2 className="landing-section-title mt-2">Match, then start.</h2>
          <ol className="mt-8 space-y-8">
            {STEPS.map((step, index) => (
              <li key={step.title}>
                <p className="text-sm font-medium text-accent">0{index + 1}</p>
                <h3 className="landing-section-title mt-2 text-xl md:text-2xl">{step.title}</h3>
                <p className="landing-section-lead mt-2 max-w-lg">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
        <div className="rise w-full md:justify-self-end">
          <FoundingTeamCluster />
        </div>
      </div>
    </LandingSection>
  );
}