import { LandingSection } from "@/components/landing-section";
import {
  LANDING_PROOF_KICKER,
  LANDING_PROOF_SOURCES,
  LANDING_PROOF_STATS,
} from "@/lib/landing-stats";

export function LandingProofStrip() {
  return (
    <LandingSection variant="card" aria-label="Enterprise AI adoption survey highlights">
      <div className="mx-auto max-w-3xl">
        <h2 className="landing-section-title text-pretty">
          Most people are still guessing. You do not have to.
        </h2>
        <ul className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-4">
          {LANDING_PROOF_STATS.map((stat) => (
            <li
              key={stat.value + stat.label.slice(0, 24)}
              className="flex flex-col rounded-none border border-border bg-card p-4 sm:min-h-[7.5rem] md:p-5"
            >
              <p className="text-2xl font-semibold tabular-nums tracking-tight text-foreground sm:text-3xl md:text-4xl">
                {stat.value}
              </p>
              <p className="landing-section-lead mt-2 text-sm leading-relaxed sm:text-sm">
                {stat.label}
              </p>
            </li>
          ))}
        </ul>
        <p className="landing-section-lead mt-6 sm:mt-8">{LANDING_PROOF_KICKER}</p>
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
          ))}{" "}
          enterprise surveys, 2026. Results vary by industry and execution.
        </p>
      </div>
    </LandingSection>
  );
}