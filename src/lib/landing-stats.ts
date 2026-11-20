export type SurveyLandingStat = {
  kind: "survey";
  value: string;
  label: string;
  sourceName: string;
  sourceUrl: string;
};

export type ProductLandingStat = {
  kind: "product";
  value: string;
  label: string;
};

export type LandingStat = SurveyLandingStat | ProductLandingStat;

export const LANDING_PROOF_STATS: readonly LandingStat[] = [
  {
    kind: "survey",
    value: "89%",
    label: "AI is already in use somewhere in the business",
    sourceName: "McKinsey",
    sourceUrl: "https://www.mckinsey.com/capabilities/quantumblack/our-insights/the-state-of-ai",
  },
  {
    kind: "survey",
    value: "28%",
    label: "Report revenue gains, and rising fast",
    sourceName: "Deloitte",
    sourceUrl:
      "https://www.deloitte.com/us/en/about/press-room/enterprise-ai-enters-an-roi-reckoning.html",
  },
  {
    kind: "survey",
    value: "2.4×",
    label: "Revenue growth for AI leaders vs laggards",
    sourceName: "BCG",
    sourceUrl: "https://www.bcg.com/publications/2026/the-formula-for-agentic-ai-value",
  },
  {
    kind: "product",
    value: "3",
    label: "Digital workers on your desk: one orchestrator you talk to, two specialists behind it",
  },
] as const;

export const LANDING_PROOF_KICKER =
  "Bot-led businesses are pulling ahead on enterprise AI value. BizOS gives you the same shape: work gets done, nothing sensitive ships without your yes.";

export const LANDING_PROOF_SOURCES: readonly { name: string; url: string }[] = [
  {
    name: "McKinsey",
    url: "https://www.mckinsey.com/capabilities/quantumblack/our-insights/the-state-of-ai",
  },
  {
    name: "Deloitte",
    url: "https://www.deloitte.com/us/en/about/press-room/enterprise-ai-enters-an-roi-reckoning.html",
  },
  {
    name: "BCG",
    url: "https://www.bcg.com/publications/2026/the-formula-for-agentic-ai-value",
  },
];