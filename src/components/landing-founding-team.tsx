import { BusinessHexMark } from "@/components/business-hex-mark";
import { FoundingTeamCluster } from "@/components/founding-team-cluster";
import { LandingSection } from "@/components/landing-section";

const STEPS = [
  {
    title: "Custom Business",
    body: "Our matching engine pairs you with a business built for your interests and situation.",
  },
  {
    title: "Start your business",
    body: "Your founding team starts working automatically. You approve what ships.",
  },
] as const;

export function LandingFoundingTeam() {
  const [stepOne, stepTwo] = STEPS;

  return (
    <LandingSection variant="default" aria-label="How BizOS works">
      <div className="mx-auto max-w-3xl">
        <div className="rise">
          <p className="landing-eyebrow">How it works</p>
          <h2 className="landing-section-title mt-2">Match, then start.</h2>
        </div>

        <ol className="mt-8 space-y-10 md:space-y-12">
          <li className="grid items-center gap-6 md:grid-cols-2 md:gap-5">
            <div className="how-step-hex-solo rise">
              <BusinessHexMark
                className="how-step-hex-solo__mark"
                shapeClassName="bizos-hex-shape--black"
                aria-hidden
              />
            </div>
            <div className="rise">
              <p className="how-step-index">01</p>
              <h3 className="how-step-title mt-2">{stepOne.title}</h3>
              <p className="how-step-lead mt-2 max-w-lg">{stepOne.body}</p>
            </div>
          </li>

          <li className="grid items-center gap-6 md:grid-cols-2 md:gap-5">
            <div className="rise md:col-start-1 md:row-start-1">
              <p className="how-step-index">02</p>
              <h3 className="how-step-title mt-2">{stepTwo.title}</h3>
              <p className="how-step-lead mt-2 max-w-lg">{stepTwo.body}</p>
            </div>
            <div className="rise how-step-cluster-stage md:col-start-2 md:row-start-1">
              <FoundingTeamCluster />
            </div>
          </li>
        </ol>
      </div>
    </LandingSection>
  );
}