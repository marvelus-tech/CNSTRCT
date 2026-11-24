import { LandingProofTrendChart } from "@/components/landing-proof-trend-chart";
import { LandingSection } from "@/components/landing-section";
import {
  LANDING_PROOF_SOURCES,
  LANDING_PROOF_STATS,
  LANDING_PROOF_TITLE,
} from "@/lib/landing-stats";

export function LandingProofStrip() {
  return (
    <LandingSection
      variant="plain"
      aria-label="Enterprise AI adoption and business formation trends"
      className="[&>div]:max-w-3xl md:[&>div]:py-4"
    >
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="landing-section-title text-pretty">{LANDING_PROOF_TITLE}</h2>

        <div className="proof-strip-visual mt-10 sm:mt-12">
          <LandingProofTrendChart />

          <ul className="proof-strip-visual-stats mt-8 grid grid-cols-3 items-start gap-x-2 gap-y-6 text-left sm:gap-x-5 md:mt-14 md:gap-12">
            {LANDING_PROOF_STATS.map((stat) => (
              <li
                key={stat.value + stat.label.slice(0, 24)}
                className="flex min-w-0 flex-col gap-2 py-2 md:gap-3 md:py-4"
              >
                <p className="text-2xl font-semibold tabular-nums tracking-tight text-foreground md:text-4xl">
                  {stat.value}
                </p>
                <span className="h-px w-6 bg-accent/40 md:w-8" aria-hidden />
                <p className="landing-section-lead text-xs leading-tight md:text-sm md:leading-snug">
                  {stat.label}
                </p>
              </li>
            ))}
          </ul>
        </div>

        <p className="landing-fine-print mt-10 text-xs sm:text-[0.6875rem]">
          Sources:{" "}
          {LANDING_PROOF_SOURCES.map((source, index) => (
            <span key={source.name}>
              {index > 0 && index < LANDING_PROOF_SOURCES.length - 1 ? ", " : null}
              {index === LANDING_PROOF_SOURCES.length - 1 && index > 0 ? ", " : null}
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
          .
        </p>
      </div>
    </LandingSection>
  );
}