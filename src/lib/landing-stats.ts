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
  "AI is now the default in business. New companies are forming at record pace. The winners are the ones that start with AI already working for them.";

export const LANDING_PROOF_STATS: readonly LandingStat[] = [
  {
    kind: "survey",
    value: "89%",
    label: "Organizations already use AI in at least one business function",
    sourceName: "McKinsey State of AI 2026",
    sourceUrl: "https://www.mckinsey.com/capabilities/quantumblack/our-insights/the-state-of-ai",
  },
  {
    kind: "survey",
    value: "28%",
    label: "Companies reporting revenue gains from AI (up from 20% earlier in the year)",
    sourceName: "Deloitte State of AI in the Enterprise 2026",
    sourceUrl:
      "https://www.deloitte.com/us/en/about/press-room/enterprise-ai-enters-an-roi-reckoning.html",
  },
  {
    kind: "survey",
    value: "2.4×",
    label: "Revenue growth of future-built AI leaders vs. laggards",
    sourceName: "BCG Applied AI Index 2026",
    sourceUrl: "https://www.bcg.com/publications/2026/the-formula-for-agentic-ai-value",
  },
] as const;

export const LANDING_PROOF_KICKER =
  "Bot-led businesses are already pulling ahead. BizOS gives you the same shape on day one: work gets done, nothing sensitive ships without your approval.";

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