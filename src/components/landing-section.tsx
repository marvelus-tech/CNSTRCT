import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type LandingSectionProps = {
  children: ReactNode;
  className?: string;
  variant?: "default" | "card" | "plain";
  id?: string;
  "aria-label"?: string;
};

/** Landing sections share the hero surface (`--background`); variants keep API compat only. */
const variantClasses: Record<NonNullable<LandingSectionProps["variant"]>, string> = {
  default: "bg-background",
  card: "bg-background",
  plain: "bg-background",
};

export function LandingSection({
  children,
  className,
  variant = "default",
  id,
  "aria-label": ariaLabel,
}: LandingSectionProps) {
  return (
    <section
      id={id}
      aria-label={ariaLabel}
      className={cn(
        "px-4 py-14 sm:px-5 md:px-10 md:py-16",
        variantClasses[variant],
        className,
      )}
    >
      <div className="mx-auto max-w-6xl">{children}</div>
    </section>
  );
}