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

function seriesToPath(points: ProofChartPoint[], yScale: (v: number) => number): string {
  return points
    .map((p, i) => {
      const cmd = i === 0 ? "M" : "L";
      return `${cmd} ${xForYear(p.year).toFixed(2)} ${yScale(p.value).toFixed(2)}`;
    })
    .join(" ");
}

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
    () => seriesToPath([...LANDING_PROOF_AI_ADOPTION_SERIES], yForPct),
    [],
  );
  const bfsPath = useMemo(
    () => seriesToPath([...LANDING_PROOF_BFS_SERIES], yForMillions),
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
            className="h-0.5 w-6 shrink-0 rounded-full bg-foreground"
            aria-hidden
          />
          {LANDING_PROOF_CHART_LEGEND.aiAdoption}
          <span className="sr-only">: {LANDING_PROOF_CHART_LEGEND_DETAIL.aiAdoption}</span>
        </span>
        <span className="inline-flex items-center gap-2">
          <span
            className="h-0.5 w-6 shrink-0 rounded-full"
            style={{ backgroundColor: "color-mix(in srgb, var(--accent) 55%, var(--foreground))" }}
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
          <linearGradient id={`proof-bfs-stroke-${gradientId}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="color-mix(in srgb, var(--accent) 35%, var(--muted))" />
            <stop offset="100%" stopColor="color-mix(in srgb, var(--accent) 70%, var(--foreground))" />
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
          stroke={`url(#proof-bfs-stroke-${gradientId})`}
          strokeWidth={1.75}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={pathsReady ? 1 : 0.85}
        />
        <path
          ref={aiPathRef}
          d={aiPath}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={pathsReady ? 1 : 0.85}
        />

        <circle cx={aiEndX} cy={aiEndY} r={4} className="fill-foreground" />
        <circle
          cx={aiEndX}
          cy={bfsEndY}
          r={4}
          fill="color-mix(in srgb, var(--accent) 55%, var(--foreground))"
        />
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