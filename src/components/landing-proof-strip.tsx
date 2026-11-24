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

        <div className="mt-10 w-full text-left max-md:px-3 sm:mt-12">
          <LandingProofTrendChart />
        </div>

        <ul className="mt-8 grid grid-cols-2 gap-x-5 gap-y-8 text-left md:mt-14 md:grid-cols-3 md:gap-12">
          {LANDING_PROOF_STATS.map((stat, index) => (
            <li
              key={stat.value + stat.label.slice(0, 24)}
              className={`flex flex-col gap-3 py-2 md:py-4${
                index === 2
                  ? " col-span-2 mx-auto w-full max-w-[14rem] md:col-span-1 md:max-w-none"
                  : ""
              }`}
            >
              <p className="text-3xl font-semibold tabular-nums tracking-tight text-foreground md:text-4xl">
                {stat.value}
              </p>
              <span className="h-px w-8 bg-accent/40" aria-hidden />
              <p className="landing-section-lead text-sm leading-snug">{stat.label}</p>
            </li>
          ))}
        </ul>

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