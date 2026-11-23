import { BusinessHexMark } from "@/components/business-hex-mark";
import { LandingSection } from "@/components/landing-section";

const FOUNDING_TEAM_BULLETS = [
  {
    emphasis: "Knows what's next",
    rest: "when you don't.",
  },
  {
    emphasis: "Works in their own digital world",
    rest: "(screen, files, tools like any hire).",
  },
  {
    emphasis: "You approve",
    rest: "before anything sensitive ships.",
  },
] as const;

export function LandingFoundingTeam() {
  return (
    <LandingSection variant="default" aria-label="Founding team on your desk">
      <div className="grid items-center gap-10 md:grid-cols-2 md:gap-12">
        <div className="rise">
          <p className="landing-eyebrow">Founding team</p>
          <h2 className="landing-section-title mt-2">They start before you ask.</h2>
          <p className="landing-section-lead mt-4 max-w-lg">
            BizOS gives you a go-to team that picks the next task, runs it on their own desk, and
            keeps moving while you focus on decisions.
          </p>
          <ul className="landing-section-lead mt-6 max-w-lg space-y-3">
            {FOUNDING_TEAM_BULLETS.map((item) => (
              <li key={item.emphasis} className="flex gap-2">
                <span className="text-foreground" aria-hidden>
                  ·
                </span>
                <span>
                  <strong className="font-medium text-foreground">{item.emphasis}</strong>{" "}
                  {item.rest}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rise w-full md:justify-self-end">
          <div className="founding-team-hex-stage">
            <BusinessHexMark
              className="founding-team-hex-stage__mark"
              shapeClassName="bizos-hex-shape--black"
              aria-hidden
            />
          </div>
        </div>
      </div>
    </LandingSection>
  );
}