export type SurveyLandingStat = {
  kind: "survey";
  value: string;
  label: string;
  sourceName: string;
  sourceUrl: string;
};

export type LandingStat = SurveyLandingStat;

export const LANDING_PROOF_HEADLINE = "The world is no longer guessing.";

export const LANDING_PROOF_SUBHEAD =
  "AI is default. New businesses are forming faster than ever.";

export const LANDING_PROOF_STATS: readonly LandingStat[] = [
  {
    kind: "survey",
    value: "89%",
    label: "Orgs using AI in at least one function",
    sourceName: "McKinsey State of AI 2026",
    sourceUrl: "https://www.mckinsey.com/capabilities/quantumblack/our-insights/the-state-of-ai",
  },
  {
    kind: "survey",
    value: "28%",
    label: "Reporting AI revenue gains",
    sourceName: "Deloitte State of AI in the Enterprise 2026",
    sourceUrl:
      "https://www.deloitte.com/us/en/about/press-room/enterprise-ai-enters-an-roi-reckoning.html",
  },
  {
    kind: "survey",
    value: "2.4×",
    label: "AI leaders' revenue growth vs. laggards",
    sourceName: "BCG Applied AI Index 2026",
    sourceUrl: "https://www.bcg.com/publications/2026/the-formula-for-agentic-ai-value",
  },
] as const;

export const LANDING_PROOF_KICKER =
  "Start with AI working for you on day one, with your approval on what ships.";

export const LANDING_PROOF_SOURCES: readonly { name: string; url: string }[] = [
  {
    name: "McKinsey State of AI (2026)",
    url: "https://www.mckinsey.com/capabilities/quantumblack/our-insights/the-state-of-ai",
  },
  {
    name: "Deloitte State of AI in the Enterprise (2026)",
    url: "https://www.deloitte.com/us/en/about/press-room/enterprise-ai-enters-an-roi-reckoning.html",
  },
  {
    name: "BCG Applied AI Index (2026)",
    url: "https://www.bcg.com/publications/2026/the-formula-for-agentic-ai-value",
  },
  {
    name: "US Census Bureau Business Formation Statistics",
    url: "https://www.census.gov/econ/bfs/",
  },
];