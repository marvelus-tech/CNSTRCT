"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/** 7×9 dot-matrix-glyphs (1 = lit). Wider grid reads better at display size. */
const GLYPH_7X9: Record<string, string[]> = {
  A: [
    "0111110",
    "1000001",
    "1000001",
    "1000001",
    "1111111",
    "1000001",
    "1000001",
    "1000001",
    "1000001",
  ],
  B: [
    "1111110",
    "1000001",
    "1000001",
    "1111110",
    "1000001",
    "1000001",
    "1000001",
    "1000001",
    "1111110",
  ],
  C: [
    "0111111",
    "1000000",
    "1000000",
    "1000000",
    "1000000",
    "1000000",
    "1000000",
    "1000000",
    "0111111",
  ],
  E: [
    "1111111",
    "1000000",
    "1000000",
    "1111110",
    "1000000",
    "1000000",
    "1000000",
    "1000000",
    "1111111",
  ],
  I: [
    "1111111",
    "0001000",
    "0001000",
    "0001000",
    "0001000",
    "0001000",
    "0001000",
    "0001000",
    "1111111",
  ],
  K: [
    "1000010",
    "1000100",
    "1001000",
    "1010000",
    "1100000",
    "1010000",
    "1001000",
    "1000100",
    "1000010",
  ],
  O: [
    "0111110",
    "1000001",
    "1000001",
    "1000001",
    "1000001",
    "1000001",
    "1000001",
    "1000001",
    "0111110",
  ],
  P: [
    "1111110",
    "1000001",
    "1000001",
    "1111110",
    "1000000",
    "1000000",
    "1000000",
    "1000000",
    "1000000",
  ],
  R: [
    "1111110",
    "1000001",
    "1000001",
    "1111110",
    "1001000",
    "1000100",
    "1000010",
    "1000010",
    "1000010",
  ],
  S: [
    "0111111",
    "1000000",
    "1000000",
    "0111110",
    "0000001",
    "0000001",
    "0000001",
    "0000001",
    "1111110",
  ],
  U: [
    "1000001",
    "1000001",
    "1000001",
    "1000001",
    "1000001",
    "1000001",
    "1000001",
    "1000001",
    "0111110",
  ],
  V: [
    "1000001",
    "1000001",
    "1000001",
    "1000001",
    "1000001",
    "1000001",
    "0100010",
    "0010100",
    "0001000",
  ],
};

const CHAR_W = 7;
const CHAR_H = 9;
const CHAR_GAP = 3;

/** Slightly smaller dots vs pitch so glyphs don’t melt together */
const PITCH = 5.4;
const DOT_R = 1.72;

function wordToDots(word: string): { x: number; y: number }[] {
  const upper = word.toUpperCase().replace(/[^A-Z]/g, "");
  const dots: { x: number; y: number }[] = [];
  let cursor = 0;

  for (const ch of upper) {
    const rows = GLYPH_7X9[ch];
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

/** Matches `Button` default `h-11` + `hud-btn-frame` 6px padding (tailwind h-11 = 2.75rem). */
export const DOT_MATRIX_ACTION_HEIGHT_CLASS = "h-11";

export function DottedArrowBack({
  className,
  label,
  word = "BACK",
  ...props
}: React.ComponentProps<"button"> & {
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
        "dotted-arrow-back group inline-flex h-11 items-center justify-center border-0 bg-transparent px-6 shadow-none",
        "text-foreground/75 transition-colors hover:text-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:pointer-events-none disabled:opacity-30",
        className,
      )}
      {...props}
    >
      <svg
        className={cn(
          DOT_MATRIX_ACTION_HEIGHT_CLASS,
          "dotted-arrow-back__glyph w-auto shrink-0 transition-transform duration-200 group-hover:-translate-x-0.5",
        )}
        viewBox={`0 0 ${width} ${height}`}
        fill="currentColor"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden
      >
        {dots.map((d, i) => (
          <circle
            key={`${d.x}-${d.y}-${i}`}
            cx={DOT_R + d.x * PITCH}
            cy={DOT_R + d.y * PITCH}
            r={DOT_R}
            className="opacity-90 transition-opacity group-hover:opacity-100"
          />
        ))}
      </svg>
    </button>
  );
}