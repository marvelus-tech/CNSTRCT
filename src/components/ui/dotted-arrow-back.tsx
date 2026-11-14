"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/** 5×7 dot-matrix glyphs (1 = lit). */
const GLYPH_5X7: Record<string, string[]> = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01111", "10000", "10000", "10000", "10000", "10000", "01111"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  I: ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
};

const CHAR_W = 5;
const CHAR_H = 7;
const CHAR_GAP = 2;

const PITCH = 6.75;
const DOT_R = 2.05;

function wordToDots(word: string): { x: number; y: number }[] {
  const upper = word.toUpperCase().replace(/[^A-Z]/g, "");
  const dots: { x: number; y: number }[] = [];
  let cursor = 0;

  for (const ch of upper) {
    const rows = GLYPH_5X7[ch];
    if (!rows) continue;
    for (let ry = 0; ry < rows.length; ry++) {
      const row = rows[ry];
      for (let cx = 0; cx < row.length; cx++) {
        if (row[cx] === "1") {
          dots.push({ x: cursor + cx, y: ry });
        }
      }
    }
    cursor += CHAR_W + CHAR_GAP;
  }

  return dots;
}

function wordSize(word: string) {
  const upper = word.toUpperCase().replace(/[^A-Z]/g, "");
  const n = upper.length;
  const gridW = n > 0 ? n * CHAR_W + (n - 1) * CHAR_GAP : CHAR_W;
  return {
    width: gridW * PITCH + DOT_R * 2,
    height: CHAR_H * PITCH + DOT_R * 2,
    gridW,
  };
}

export type DotMatrixWord = "BACK" | "PREVIOUS";

export function DottedArrowBack({
  className,
  label,
  word = "BACK",
  ...props
}: React.ComponentProps<"button"> & {
  /** Visible word rendered as dot matrix. */
  word?: DotMatrixWord;
  label?: string;
}) {
  const aria = label ?? word;
  const dots = React.useMemo(() => wordToDots(word), [word]);
  const { width, height } = wordSize(word);

  return (
    <button
      type="button"
      aria-label={aria}
      className={cn(
        "dotted-arrow-back group inline-flex items-center border-0 bg-transparent p-1 shadow-none",
        "text-foreground/70 transition-colors hover:text-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:pointer-events-none disabled:opacity-30",
        className,
      )}
      {...props}
    >
      <svg
        className="dotted-arrow-back__glyph block shrink-0 transition-transform duration-200 group-hover:-translate-x-0.5"
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        fill="currentColor"
        aria-hidden
      >
        {dots.map((d, i) => (
          <circle
            key={`${d.x}-${d.y}-${i}`}
            cx={DOT_R + d.x * PITCH}
            cy={DOT_R + d.y * PITCH}
            r={DOT_R}
            className="opacity-[0.88] transition-opacity group-hover:opacity-100"
          />
        ))}
      </svg>
    </button>
  );
}