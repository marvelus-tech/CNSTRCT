"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export const DOT_MATRIX_ACTION_HEIGHT_CLASS = "h-11";

/**
 * Back control styled like the triage step readout (tabular sans “countdown”).
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
        "hud-readout group inline-flex items-center gap-2 border-0 bg-transparent px-3 shadow-none sm:gap-2.5 sm:px-6",
        "text-muted transition-colors hover:text-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:pointer-events-none disabled:opacity-30",
        className,
      )}
      {...props}
    >
      <span
        aria-hidden
        className="inline-block translate-y-px text-[1.35rem] font-medium leading-none tracking-[0.2em] text-foreground/65 transition-transform duration-200 group-hover:-translate-x-0.5 group-hover:text-foreground"
      >
        ‹
      </span>
      {showLabel ? <span>{label}</span> : null}
    </button>
  );
}