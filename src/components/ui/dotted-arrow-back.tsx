"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/** Frameless back control: left chevron built from “space” dots (no HUD box). */
export function DottedArrowBack({
  className,
  label = "Back",
  ...props
}: React.ComponentProps<"button"> & { label?: string }) {
  const dot = (cx: number, cy: number, r = 1.35, opacity = 0.55) => (
    <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill="currentColor" opacity={opacity} />
  );

  const dots = [
    dot(14, 2, 1.2, 0.4),
    dot(10, 6, 1.35, 0.5),
    dot(6, 10, 1.5, 0.65),
    dot(2, 14, 1.65, 0.85),
    dot(6, 18, 1.5, 0.65),
    dot(10, 22, 1.35, 0.5),
    dot(14, 26, 1.2, 0.4),
    dot(5, 14, 1.1, 0.35),
    dot(8, 14, 1.1, 0.35),
    dot(11, 14, 1.1, 0.35),
  ];

  return (
    <button
      type="button"
      className={cn(
        "dotted-arrow-back group inline-flex min-h-11 items-center gap-3 rounded-none border-0 bg-transparent p-2 text-muted shadow-none",
        "uppercase tracking-[0.14em] text-[11px] font-medium",
        "transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:pointer-events-none disabled:opacity-30",
        className,
      )}
      {...props}
    >
      <svg
        className="dotted-arrow-back__glyph size-7 shrink-0 text-foreground/80 transition-transform group-hover:-translate-x-0.5 group-enabled:group-hover:text-foreground"
        viewBox="0 0 18 28"
        aria-hidden
      >
        {dots}
      </svg>
      <span>{label}</span>
    </button>
  );
}