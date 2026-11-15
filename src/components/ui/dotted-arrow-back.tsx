"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type Dot = readonly [cx: number, cy: number, r: number, opacity: number];

/** Left chevron + fading telemetry trail (horizontal). */
const CHEVRON: Dot[] = [
  [5, 12, 1.55, 1],
  [8.5, 8.5, 1.25, 0.92],
  [8.5, 15.5, 1.25, 0.92],
  [12, 5.5, 1.05, 0.78],
  [12, 18.5, 1.05, 0.78],
  [15.5, 3.5, 0.9, 0.62],
  [15.5, 20.5, 0.9, 0.62],
];

const TRAIL: Dot[] = [
  [18.5, 12, 0.85, 0.5],
  [21, 12, 0.65, 0.32],
  [23, 12, 0.45, 0.18],
];

const VIEW_W = 24;
const VIEW_H = 24;

export const DOT_MATRIX_ACTION_HEIGHT_CLASS = "h-11";

export function DottedArrowBack({
  className,
  label = "Back",
  showLabel = true,
  ...props
}: React.ComponentProps<"button"> & {
  label?: string;
  showLabel?: boolean;
}) {
  const dots = [...CHEVRON, ...TRAIL];

  return (
    <button
      type="button"
      aria-label={label}
      className={cn(
        "dotted-arrow-back group inline-flex h-11 items-center gap-2 border-0 bg-transparent px-3 shadow-none sm:gap-3 sm:px-6",
        "text-muted transition-colors hover:text-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:pointer-events-none disabled:opacity-30",
        className,
      )}
      {...props}
    >
      <svg
        className={cn(
          DOT_MATRIX_ACTION_HEIGHT_CLASS,
          "dotted-arrow-back__glyph w-10 shrink-0 text-foreground/75 transition-[transform,color] duration-200 group-hover:-translate-x-0.5 group-hover:text-foreground",
        )}
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        fill="currentColor"
        aria-hidden
      >
        {dots.map(([cx, cy, r, opacity], i) => (
          <circle key={i} cx={cx} cy={cy} r={r} opacity={opacity} />
        ))}
      </svg>
      {showLabel ? (
        <span className="text-[11px] font-medium uppercase tracking-[0.14em]">{label}</span>
      ) : null}
    </button>
  );
}