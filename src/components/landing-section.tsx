import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type LandingSectionProps = {
  children: ReactNode;
  className?: string;
  variant?: "default" | "card" | "plain";
  /** Extra top padding for the first main section below the hero. */
  afterHero?: boolean;
  id?: string;
  "aria-label"?: string;
};

/** Landing sections share the hero surface (`--card`, lightest grey); variants keep API compat only. */
const variantClasses: Record<NonNullable<LandingSectionProps["variant"]>, string> = {
  default: "bg-card",
  card: "bg-card",
  plain: "bg-card",
};

export function LandingSection({
  children,
  className,
  variant = "default",
  afterHero = false,
  id,
  "aria-label": ariaLabel,
}: LandingSectionProps) {
  return (
    <section
      id={id}
      aria-label={ariaLabel}
      className={cn(
        "landing-section-shell px-4 sm:px-5 md:px-10",
        afterHero && "landing-section-shell--after-hero",
        variantClasses[variant],
        className,
      )}
    >
      <div className="mx-auto max-w-6xl">{children}</div>
    </section>
  );
}