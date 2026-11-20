import { LandingSection } from "@/components/landing-section";
import {
  LANDING_PROOF_KICKER,
  LANDING_PROOF_SOURCES,
  LANDING_PROOF_STATS,
} from "@/lib/landing-stats";

export function LandingProofStrip() {
  return (
    <LandingSection
      variant="card"
      aria-label="Enterprise AI adoption and BizOS digital workers"
      className="[&>div]:max-w-6xl"
    >
      <h2 className="landing-section-title max-w-3xl">
        Most people are still guessing. You do not have to.
      </h2>
      <ul className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {LANDING_PROOF_STATS.map((stat) => (
          <li
            key={stat.value + stat.label.slice(0, 24)}
            className="flex flex-col rounded-none border border-border bg-background/40 p-4 md:p-5"
          >
            <p className="text-3xl font-semibold tabular-nums tracking-tight text-foreground md:text-4xl">
              {stat.value}
            </p>
            <p className="mt-2 text-sm leading-snug text-muted">{stat.label}</p>
          </li>
        ))}
      </ul>
      <p className="landing-section-lead mt-6 max-w-3xl">{LANDING_PROOF_KICKER}</p>
      <p className="landing-fine-print mt-4 max-w-3xl">
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
    </LandingSection>
  );
}