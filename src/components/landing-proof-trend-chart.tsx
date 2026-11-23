"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  LANDING_PROOF_AI_ADOPTION_SERIES,
  LANDING_PROOF_BFS_SERIES,
  LANDING_PROOF_CHART_AI_MAX_PCT,
  LANDING_PROOF_CHART_ARIA_LABEL,
  LANDING_PROOF_CHART_BFS_MAX_MILLIONS,
  LANDING_PROOF_CHART_ENDPOINTS,
  LANDING_PROOF_CHART_LEGEND,
  LANDING_PROOF_CHART_LEGEND_DETAIL,
  LANDING_PROOF_CHART_X_TICK_YEARS,
  LANDING_PROOF_CHART_YEAR_MAX,
  LANDING_PROOF_CHART_YEAR_MIN,
  type ProofChartPoint,
} from "@/lib/landing-proof-chart-data";

const VIEW_W = 800;
const VIEW_H = 300;
const MARGIN = { top: 12, right: 52, bottom: 32, left: 44 };
const PLOT_W = VIEW_W - MARGIN.left - MARGIN.right;
const PLOT_H = VIEW_H - MARGIN.top - MARGIN.bottom;

function xForYear(year: number): number {
  const span = LANDING_PROOF_CHART_YEAR_MAX - LANDING_PROOF_CHART_YEAR_MIN;
  const t = (year - LANDING_PROOF_CHART_YEAR_MIN) / span;
  return MARGIN.left + t * PLOT_W;
}

function yForPct(pct: number): number {
  const t = pct / LANDING_PROOF_CHART_AI_MAX_PCT;
  return MARGIN.top + (1 - t) * PLOT_H;
}

function yForMillions(millions: number): number {
  const t = millions / LANDING_PROOF_CHART_BFS_MAX_MILLIONS;
  return MARGIN.top + (1 - t) * PLOT_H;
}

/** Catmull–Rom segments converted to cubic Beziers; passes through each year's point. */
function seriesToSmoothPath(points: ProofChartPoint[], yScale: (v: number) => number): string {
  const pts = points.map((p) => ({
    x: xForYear(p.year),
    y: yScale(p.value),
  }));

  if (pts.length === 0) return "";
  if (pts.length === 1) {
    return `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
  }
  if (pts.length === 2) {
    return `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)} L ${pts[1].x.toFixed(2)} ${pts[1].y.toFixed(2)}`;
  }

  let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;

  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }

  return d;
}

const AI_STROKE_GRADIENT_STOPS = [
  { offset: "0%", color: "#b45309" },
  { offset: "22%", color: "#e85d04" },
  { offset: "48%", color: "#f9738a" },
  { offset: "74%", color: "#4ade80" },
  { offset: "100%", color: "#16a34a" },
] as const;

const CHART_STROKE_AI = 4.7;
const CHART_STROKE_BFS = 4.5;

const GRID_PCTS = [0, 50, 100] as const;
const BFS_TICKS_M = [0, 3, 6] as const;

export function LandingProofTrendChart() {
  const gradientId = useId().replace(/:/g, "");
  const aiPathRef = useRef<SVGPathElement>(null);
  const bfsPathRef = useRef<SVGPathElement>(null);
  const [reducedMotion, setReducedMotion] = useState(true);
  const [pathsReady, setPathsReady] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReducedMotion(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (reducedMotion) {
      setPathsReady(true);
      return;
    }
    const ai = aiPathRef.current;
    const bfs = bfsPathRef.current;
    if (!ai || !bfs) return;

    for (const el of [ai, bfs]) {
      const len = el.getTotalLength();
      el.style.strokeDasharray = `${len}`;
      el.style.strokeDashoffset = `${len}`;
    }
    setPathsReady(true);
    requestAnimationFrame(() => {
      for (const el of [ai, bfs]) {
        el.style.transition = "stroke-dashoffset 1.1s ease-out";
        el.style.strokeDashoffset = "0";
      }
    });
  }, [reducedMotion]);

  const aiPath = useMemo(
    () => seriesToSmoothPath([...LANDING_PROOF_AI_ADOPTION_SERIES], yForPct),
    [],
  );
  const bfsPath = useMemo(
    () => seriesToSmoothPath([...LANDING_PROOF_BFS_SERIES], yForMillions),
    [],
  );

  const endYear = LANDING_PROOF_CHART_YEAR_MAX;
  const aiEnd = LANDING_PROOF_AI_ADOPTION_SERIES.find((p) => p.year === endYear)!;
  const bfsEnd = LANDING_PROOF_BFS_SERIES.find((p) => p.year === endYear)!;
  const aiEndX = xForYear(endYear);
  const aiEndY = yForPct(aiEnd.value);
  const bfsEndY = yForMillions(bfsEnd.value);

  return (
    <figure className="w-full">
      <div className="landing-section-lead mb-8 flex flex-col gap-2 text-left text-xs sm:text-sm md:flex-row md:flex-wrap md:items-center md:gap-x-8 md:gap-y-1">
        <span className="inline-flex items-center gap-2">
          <span
            className="h-1 w-6 shrink-0 rounded-full"
            style={{ background: "var(--proof-chart-ai-swatch)" }}
            aria-hidden
          />
          {LANDING_PROOF_CHART_LEGEND.aiAdoption}
          <span className="sr-only">: {LANDING_PROOF_CHART_LEGEND_DETAIL.aiAdoption}</span>
        </span>
        <span className="inline-flex items-center gap-2">
          <span
            className="h-1 w-6 shrink-0 rounded-full"
            style={{ backgroundColor: "var(--proof-chart-bfs-stroke)" }}
            aria-hidden
          />
          {LANDING_PROOF_CHART_LEGEND.businessApplications}
          <span className="sr-only">: {LANDING_PROOF_CHART_LEGEND_DETAIL.businessApplications}</span>
        </span>
      </div>

      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="h-auto w-full text-foreground"
        role="img"
        aria-label={LANDING_PROOF_CHART_ARIA_LABEL}
      >
        <defs>
          <linearGradient
            id={`proof-ai-stroke-${gradientId}`}
            gradientUnits="userSpaceOnUse"
            x1={MARGIN.left}
            y1={0}
            x2={VIEW_W - MARGIN.right}
            y2={0}
          >
            {AI_STROKE_GRADIENT_STOPS.map((stop) => (
              <stop key={stop.offset} offset={stop.offset} stopColor={stop.color} />
            ))}
          </linearGradient>
        </defs>

        {GRID_PCTS.map((pct) => {
          const y = yForPct(pct);
          return (
            <g key={pct}>
              <line
                x1={MARGIN.left}
                y1={y}
                x2={VIEW_W - MARGIN.right}
                y2={y}
                stroke="currentColor"
                strokeOpacity={0.1}
                strokeWidth={1}
              />
              {pct < 100 ? (
                <text
                  x={MARGIN.left - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-muted-foreground text-[11px] tabular-nums"
                >
                  {pct}%
                </text>
              ) : null}
            </g>
          );
        })}

        {BFS_TICKS_M.map((m) => {
          const y = yForMillions(m);
          return (
            <text
              key={m}
              x={VIEW_W - MARGIN.right + 8}
              y={y + 4}
              textAnchor="start"
              className="fill-muted-foreground text-[11px] tabular-nums"
            >
              {m}M
            </text>
          );
        })}

        {LANDING_PROOF_CHART_X_TICK_YEARS.map((year) => (
          <text
            key={year}
            x={xForYear(year)}
            y={VIEW_H - 10}
            textAnchor="middle"
            className="fill-muted-foreground text-[10px] tabular-nums sm:text-[11px]"
          >
            {year}
          </text>
        ))}

        <path
          ref={bfsPathRef}
          d={bfsPath}
          fill="none"
          stroke="var(--proof-chart-bfs-stroke)"
          strokeWidth={CHART_STROKE_BFS}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={pathsReady ? 1 : 0.85}
        />
        <path
          ref={aiPathRef}
          d={aiPath}
          fill="none"
          stroke={`url(#proof-ai-stroke-${gradientId})`}
          strokeWidth={CHART_STROKE_AI}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={pathsReady ? 1 : 0.85}
        />

        <circle cx={aiEndX} cy={aiEndY} r={4} fill="#16a34a" />
        <circle cx={aiEndX} cy={bfsEndY} r={4} fill="var(--proof-chart-bfs-stroke)" />
      </svg>

      <div
        className="mt-2 grid grid-cols-2 gap-4 border-t border-border/25 pt-4 sm:ml-auto sm:max-w-sm sm:gap-6"
        aria-hidden
      >
        <div className="text-left sm:text-right">
          <p className="text-lg font-semibold tabular-nums tracking-tight text-foreground">
            {LANDING_PROOF_CHART_ENDPOINTS.aiAdoptionPct}%
          </p>
          <p className="landing-section-lead text-[11px] leading-snug">AI adoption (2026)</p>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-lg font-semibold tabular-nums tracking-tight text-foreground">
            {LANDING_PROOF_CHART_ENDPOINTS.businessApplicationsMillions}M
          </p>
          <p className="landing-section-lead text-[11px] leading-snug">New applications, US (2026)</p>
        </div>
      </div>

      <table className="sr-only">
        <caption>Proof section trend data</caption>
        <thead>
          <tr>
            <th scope="col">Year</th>
            <th scope="col">AI adoption (%)</th>
            <th scope="col">US new business applications (millions)</th>
          </tr>
        </thead>
        <tbody>
          {LANDING_PROOF_AI_ADOPTION_SERIES.map((ai, i) => (
            <tr key={ai.year}>
              <td>{ai.year}</td>
              <td>{ai.value}</td>
              <td>{LANDING_PROOF_BFS_SERIES[i]?.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}