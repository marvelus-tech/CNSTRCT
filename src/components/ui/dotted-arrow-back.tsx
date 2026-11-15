"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export const DOT_MATRIX_ACTION_HEIGHT_CLASS = "h-11";

/** Thin line chevron — same 1px crosshair language as the landing hero void. */
function HudLineChevron({ className }: { className?: string }) {
  return (
    <span
      className={cn("relative inline-block h-[0.875rem] w-[0.875rem] shrink-0 sm:h-4 sm:w-4", className)}
      aria-hidden
    >
      <span
        className="absolute right-[8%] top-[22%] h-px w-[88%] origin-right -rotate-[54deg] bg-current opacity-[0.72]"
        aria-hidden
      />
      <span
        className="absolute right-[8%] bottom-[22%] h-px w-[88%] origin-right rotate-[54deg] bg-current opacity-[0.72]"
        aria-hidden
      />
    </span>
  );
}

/**
 * Back control: HUD tabular type (triage “3 of 7” readout) + crosshair line arrow.
 */
export function DottedArrowBack({
  className,
  label = "Back",
  showLabel = true,
  ...props
}: React.ComponentProps<"button"> & {
  label?: string;
  showLabel?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cn(
        DOT_MATRIX_ACTION_HEIGHT_CLASS,
        "hud-readout group inline-flex items-center gap-2.5 border-0 bg-transparent px-3 shadow-none sm:gap-3 sm:px-6",
        "text-muted transition-colors hover:text-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:pointer-events-none disabled:opacity-30",
        className,
      )}
      {...props}
    >
      <HudLineChevron className="text-foreground/70 transition-[transform,color] duration-200 group-hover:-translate-x-0.5 group-hover:text-foreground" />
      {showLabel ? <span>{label}</span> : null}
    </button>
  );
}