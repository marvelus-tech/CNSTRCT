import { LandingProofTrendChart } from "@/components/landing-proof-trend-chart";
import { LandingSection } from "@/components/landing-section";
import {
  LANDING_PROOF_HEADLINE,
  LANDING_PROOF_KICKER,
  LANDING_PROOF_SOURCES,
  LANDING_PROOF_STATS,
  LANDING_PROOF_SUBHEAD,
} from "@/lib/landing-stats";

export function LandingProofStrip() {
  return (
    <LandingSection
      variant="plain"
      aria-label="Enterprise AI adoption and business formation trends"
      className="[&>div]:max-w-3xl"
    >
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="landing-section-title text-pretty">{LANDING_PROOF_HEADLINE}</h2>
        <p className="landing-section-lead mx-auto mt-4 max-w-2xl text-pretty">
          {LANDING_PROOF_SUBHEAD}
        </p>

        <div className="mt-10 w-full text-left">
          <LandingProofTrendChart />
        </div>

        <ul className="mt-10 grid grid-cols-1 gap-6 text-left md:grid-cols-3 md:gap-8">
          {LANDING_PROOF_STATS.map((stat) => (
            <li
              key={stat.value + stat.label.slice(0, 24)}
              className="flex flex-col gap-2 py-4 md:py-6"
            >
              <p className="text-3xl font-semibold tabular-nums tracking-tight text-foreground md:text-4xl">
                {stat.value}
              </p>
              <span className="h-px w-8 bg-accent/40" aria-hidden />
              <p className="landing-section-lead text-sm leading-relaxed">{stat.label}</p>
            </li>
          ))}
        </ul>

        <p className="landing-section-lead mx-auto mt-8 max-w-2xl text-pretty">{LANDING_PROOF_KICKER}</p>
        <p className="landing-fine-print mt-4 text-xs sm:text-[0.6875rem]">
          Figures from{" "}
          {LANDING_PROOF_SOURCES.map((source, index) => (
            <span key={source.name}>
              {index > 0 && index < LANDING_PROOF_SOURCES.length - 1 ? ", " : null}
              {index === LANDING_PROOF_SOURCES.length - 1 && index > 0 ? ", and " : null}
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="underline decoration-border underline-offset-2 hover:text-foreground"
              >
                {source.name}
              </a>
            </span>
          ))}
          . Results vary by industry and execution.
        </p>
      </div>
    </LandingSection>
  );
}