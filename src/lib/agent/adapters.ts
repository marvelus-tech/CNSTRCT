import type { AgentRole } from "../types";

/**
 * Composio holds OAuth tokens. Orgo holds Linux computers.
 * Neither runs unless its key is set, and a missing key is not a successful send or a real VM.
 * Secrets are never written onto the VM.
 */

export const ORGO_SMALL = { cpu: 0.5, ram: 4, diskGb: 20, label: "Small" } as const;

/** Gmail send is not wired in this MVP. The model list and the session list stay empty so they match. */
export const GMAIL_MODEL_TOOLS = [] as const;
export const GMAIL_SEND_SLUG = "GMAIL_SEND_EMAIL";

export type ConnectionState = "not_configured" | "not_connected" | "connected" | "expired";
export type ComputerState = "not_configured" | "not_connected" | "connected";

export interface DirectToolsSession {
  tenantUserId: string;
  sessionPreset: "direct_tools";
  manageConnections: { enable: false };
  sandbox: { enable: false };
  toolkits?: { enable: string[] };
  tools?: { gmail: { enable: string[] } };
  connectedAccounts?: { gmail: string[] };
}

export function composioTenantId(businessId: string) {
  return `biz_${businessId}`;
}

export function composioConfigured() {
  return Boolean(process.env.COMPOSIO_API_KEY);
}

export function orgoConfigured() {
  return Boolean(process.env.ORGO_API_KEY);
}

export function connectionState(input: {
  keySet: boolean;
  connectedAccountId: string | null;
  storedStatus?: string | null;
}): ConnectionState {
  if (input.storedStatus === "expired") return "expired";
  if (input.connectedAccountId) return "connected";
  if (!input.keySet) return "not_configured";
  return "not_connected";
}

export function computerState(computerId: string | null, keySet: boolean): ComputerState {
  if (computerId) return "connected";
  if (!keySet) return "not_configured";
  return "not_connected";
}

/** Desk label uses specialist computer ids only. One id is not "the desk is connected". */
export function orgoDeskLabel(computerIds: Array<string | null>, keySet: boolean) {
  const connected = computerIds.filter((id) => Boolean(id)).length;
  if (connected === 0) return `Orgo ${computerState(null, keySet).replaceAll("_", " ")}`;
  return `Orgo ${connected} of ${computerIds.length} connected`;
}

export function sessionForRole(input: {
  businessId: string;
  role: AgentRole;
  connectedAccountId?: string | null;
}): DirectToolsSession {
  const base = {
    tenantUserId: composioTenantId(input.businessId),
    sessionPreset: "direct_tools" as const,
    manageConnections: { enable: false as const },
    sandbox: { enable: false as const },
  };
  if (input.role === "orchestrator") {
    return { ...base, toolkits: { enable: [] } };
  }
  const session: DirectToolsSession = {
    ...base,
    toolkits: { enable: [] },
    tools: { gmail: { enable: [] } },
  };
  if (input.connectedAccountId) session.connectedAccounts = { gmail: [input.connectedAccountId] };
  return session;
}

export type Delivery =
  | { delivered: false; reason: "not_configured" | "not_connected" | "sdk_not_loaded" | "provider_error"; detail?: string }
  | { delivered: true; logId: string };

/**
 * Gmail send stays unavailable in this MVP.
 * A key, a connected account, or a missing SDK must not be reported as a sent email.
 * The session enable list is empty, so this function does not call execute.
 */
export async function deliverComposioSend(_input: {
  businessId: string;
  role: AgentRole;
  connectedAccountId: string | null;
  args: Record<string, unknown>;
}): Promise<Delivery> {
  return {
    delivered: false,
    reason: "not_configured",
    detail: "Gmail send is not available in this MVP.",
  };
}

