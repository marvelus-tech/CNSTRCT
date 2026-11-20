import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type LandingSectionProps = {
  children: ReactNode;
  className?: string;
  variant?: "default" | "card" | "plain";
  id?: string;
  "aria-label"?: string;
};

const variantClasses: Record<NonNullable<LandingSectionProps["variant"]>, string> = {
  default: "border-y border-border bg-background",
  card: "border-y border-border bg-card",
  plain: "",
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