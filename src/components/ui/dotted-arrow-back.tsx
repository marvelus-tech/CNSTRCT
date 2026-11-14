"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type DotSpec = readonly [cx: number, cy: number, r: number, opacity: number];

/** Left chevron + fading telemetry trail — horizontal, no frame. */
const CHEVRON: DotSpec[] = [
  [5, 12, 1.55, 1],
  [8.5, 8.5, 1.25, 0.92],
  [8.5, 15.5, 1.25, 0.92],
  [12, 5.5, 1.05, 0.78],
  [12, 18.5, 1.05, 0.78],
  [15.5, 3.5, 0.9, 0.62],
  [15.5, 20.5, 0.9, 0.62],
];

const TRAIL: DotSpec[] = [
  [18.5, 12, 0.85, 0.5],
  [21, 12, 0.65, 0.32],
  [23, 12, 0.45, 0.18],
];

export function DottedArrowBack({
  className,
  label = "Back",
  showLabel = true,
  ...props
}: React.ComponentProps<"button"> & { label?: string; showLabel?: boolean }) {
  const all = [...CHEVRON, ...TRAIL];

  return (
    <button
      type="button"
      aria-label={label}
      className={cn(
        "dotted-arrow-back group inline-flex min-h-11 items-center gap-4 border-0 bg-transparent p-0 shadow-none",
        "text-muted transition-colors hover:text-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:pointer-events-none disabled:opacity-30",
        className,
      )}
      {...props}
    >
      <svg
        className="dotted-arrow-back__glyph block h-6 w-10 shrink-0 text-foreground/75 transition-[transform,color] duration-200 group-hover:-translate-x-1 group-hover:text-foreground"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden
      >
        {all.map(([cx, cy, r, opacity], i) => (
          <circle
            key={i}
            className={i >= CHEVRON.length ? "dotted-arrow-back__trail" : undefined}
            cx={cx}
            cy={cy}
            r={r}
            opacity={opacity}
            style={{ animationDelay: `${i * 70}ms` }}
          />
        ))}
      </svg>
      {showLabel ? (
        <span className="text-[11px] font-medium uppercase tracking-[0.14em]">{label}</span>
      ) : null}
    </button>
  );
}