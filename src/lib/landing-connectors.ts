export type LandingConnector = {
  readonly id: string;
  readonly name: string;
  /** Ring index: 0 inner, 1 mid, 2 outer */
  readonly orbitIndex: 0 | 1 | 2;
  /** Starting angle on the ellipse, degrees */
  readonly angleDeg: number;
  readonly brandColor?: string;
};

/** Popular business tools — orbit density: 11 satellites across 3 rings. */
export const LANDING_CONNECTORS: readonly LandingConnector[] = [
  { id: "github", name: "GitHub", orbitIndex: 0, angleDeg: 0, brandColor: "#24292f" },
  { id: "gmail", name: "Gmail", orbitIndex: 0, angleDeg: 120, brandColor: "#ea4335" },
  { id: "slack", name: "Slack", orbitIndex: 0, angleDeg: 240, brandColor: "#4a154b" },
  { id: "notion", name: "Notion", orbitIndex: 1, angleDeg: 0, brandColor: "#000000" },
  { id: "google-sheets", name: "Google Sheets", orbitIndex: 1, angleDeg: 90, brandColor: "#0f9d58" },
  { id: "google-drive", name: "Google Drive", orbitIndex: 1, angleDeg: 180, brandColor: "#4285f4" },
  { id: "shopify", name: "Shopify", orbitIndex: 1, angleDeg: 270, brandColor: "#96bf48" },
  { id: "supabase", name: "Supabase", orbitIndex: 2, angleDeg: 0, brandColor: "#3ecf8e" },
  { id: "hubspot", name: "HubSpot", orbitIndex: 2, angleDeg: 90, brandColor: "#ff7a59" },
  { id: "linear", name: "Linear", orbitIndex: 2, angleDeg: 180, brandColor: "#5e6ad2" },
  { id: "salesforce", name: "Salesforce", orbitIndex: 2, angleDeg: 270, brandColor: "#00a1e0" },
] as const;

export const LANDING_CONNECTOR_TOOL_NAMES = LANDING_CONNECTORS.map((c) => c.name);