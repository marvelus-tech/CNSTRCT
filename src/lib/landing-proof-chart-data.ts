export type ProofChartPoint = {
  year: number;
  value: number;
};

/** McKinsey-style anchors; linear interpolation between years. */
const AI_ADOPTION_ANCHORS: readonly ProofChartPoint[] = [
  { year: 2017, value: 20 },
  { year: 2023, value: 55 },
  { year: 2024, value: 78 },
  { year: 2025, value: 88 },
  { year: 2026, value: 89 },
] as const;

/** Census BFS trajectory (millions of applications). */
const BFS_ANCHORS: readonly ProofChartPoint[] = [
  { year: 2017, value: 3.2 },
  { year: 2019, value: 3.5 },
  { year: 2020, value: 4.8 },
  { year: 2022, value: 5.2 },
  { year: 2025, value: 5.7 },
  { year: 2026, value: 5.7 },
] as const;

export const LANDING_PROOF_CHART_YEAR_MIN = 2017;
export const LANDING_PROOF_CHART_YEAR_MAX = 2026;

export const LANDING_PROOF_CHART_AI_MAX_PCT = 100;
export const LANDING_PROOF_CHART_BFS_MAX_MILLIONS = 6;

export const LANDING_PROOF_CHART_LEGEND = {
  aiAdoption:
    "AI adoption in organizations (% using AI in at least one business function)",
  businessApplications: "US new business applications (millions)",
} as const;

export const LANDING_PROOF_CHART_ARIA_LABEL =
  "Dual trend chart, 2017 through 2026: AI adoption in organizations rises from about 20% to 89%, while US new business applications rise from about 3.2 million to 5.7 million.";

function interpolateSeries(
  anchors: readonly ProofChartPoint[],
  yearMin: number,
  yearMax: number,
): ProofChartPoint[] {
  const sorted = [...anchors].sort((a, b) => a.year - b.year);
  const out: ProofChartPoint[] = [];

  for (let year = yearMin; year <= yearMax; year++) {
    if (sorted.some((p) => p.year === year)) {
      out.push({ year, value: sorted.find((p) => p.year === year)!.value });
      continue;
    }

    let left = sorted[0];
    let right = sorted[sorted.length - 1];
    for (let i = 0; i < sorted.length - 1; i++) {
      if (year > sorted[i].year && year < sorted[i + 1].year) {
        left = sorted[i];
        right = sorted[i + 1];
        break;
      }
    }

    const span = right.year - left.year;
    const t = span === 0 ? 0 : (year - left.year) / span;
    const value = left.value + t * (right.value - left.value);
    out.push({ year, value: Math.round(value * 100) / 100 });
  }

  return out;
}

export const LANDING_PROOF_AI_ADOPTION_SERIES: readonly ProofChartPoint[] =
  interpolateSeries(AI_ADOPTION_ANCHORS, LANDING_PROOF_CHART_YEAR_MIN, LANDING_PROOF_CHART_YEAR_MAX);

export const LANDING_PROOF_BFS_SERIES: readonly ProofChartPoint[] = interpolateSeries(
  BFS_ANCHORS,
  LANDING_PROOF_CHART_YEAR_MIN,
  LANDING_PROOF_CHART_YEAR_MAX,
);

export const LANDING_PROOF_CHART_ENDPOINTS = {
  aiAdoptionPct: 89,
  businessApplicationsMillions: 5.7,
} as const;