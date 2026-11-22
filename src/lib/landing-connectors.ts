export type LandingConnector = {
  readonly id: string;
  readonly name: string;
};

/** Train order on the single orbit path (11 tools). */
export const LANDING_CONNECTORS: readonly LandingConnector[] = [
  { id: "github", name: "GitHub" },
  { id: "gmail", name: "Gmail" },
  { id: "slack", name: "Slack" },
  { id: "notion", name: "Notion" },
  { id: "google-sheets", name: "Google Sheets" },
  { id: "google-drive", name: "Google Drive" },
  { id: "shopify", name: "Shopify" },
  { id: "supabase", name: "Supabase" },
  { id: "hubspot", name: "HubSpot" },
  { id: "linear", name: "Linear" },
  { id: "salesforce", name: "Salesforce" },
] as const;

export const LANDING_CONNECTOR_TOOL_NAMES = LANDING_CONNECTORS.map((c) => c.name);

export const LANDING_CONNECTOR_COUNT = LANDING_CONNECTORS.length;