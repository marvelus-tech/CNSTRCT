import type { AgentRole } from "../types";

/**
 * Composio holds OAuth tokens. Orgo holds Linux computers.
 * Neither runs unless its key is set, and a missing key is not a successful send or a real VM.
 * Secrets are never written onto the VM.
 */

export const ORGO_SMALL = { cpu: 0.5, ram: 4, diskGb: 20, label: "Small" } as const;

export const GMAIL_MODEL_TOOLS = ["GMAIL_FETCH_EMAILS", "GMAIL_CREATE_EMAIL_DRAFT"] as const;
export const GMAIL_SEND_SLUG = "GMAIL_SEND_EMAIL";

export type ConnectionState = "not_configured" | "not_connected" | "connected" | "expired";
export type ComputerState = "not_configured" | "not_connected" | "connected";

export interface DirectToolsSession {
  tenantUserId: string;
  sessionPreset: "direct_tools";
  manageConnections: { enable: false };
  sandbox: { enable: false };
  toolkits?: { enable: [] };
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
    tools: { gmail: { enable: [...GMAIL_MODEL_TOOLS] } },
  };
  if (input.connectedAccountId) session.connectedAccounts = { gmail: [input.connectedAccountId] };
  return session;
}

export type Delivery =
  | { delivered: false; reason: "not_configured" | "not_connected" | "sdk_not_loaded" | "provider_error"; detail?: string }
  | { delivered: true; logId: string };

/**
 * Live send exists only when the key, a connected account, and the SDK are all present.
 * Any miss returns a reason. Callers must not describe that as a sent email.
 */
export async function deliverComposioSend(input: {
  businessId: string;
  role: AgentRole;
  connectedAccountId: string | null;
  args: Record<string, unknown>;
}): Promise<Delivery> {
  if (!composioConfigured()) return { delivered: false, reason: "not_configured" };
  if (!input.connectedAccountId) return { delivered: false, reason: "not_connected" };
  if (input.role === "orchestrator") return { delivered: false, reason: "provider_error", detail: "Orchestrator has no send session." };
  const loaded = await loadComposio();
  if (!loaded) return { delivered: false, reason: "sdk_not_loaded" };
  try {
    const session = await loaded.create(composioTenantId(input.businessId), sessionForRole(input));
    const result = await session.execute(GMAIL_SEND_SLUG, input.args);
    const logId = result.logId || result.id;
    if (!logId) return { delivered: false, reason: "provider_error", detail: "Composio returned no log id." };
    return { delivered: true, logId };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Composio send failed";
    return { delivered: false, reason: "provider_error", detail };
  }
}

interface ComposioSession {
  execute: (slug: string, args: Record<string, unknown>) => Promise<{ logId?: string; id?: string }>;
}

interface ComposioModule {
  create: (userId: string, config: DirectToolsSession) => Promise<ComposioSession>;
}

async function loadComposio(): Promise<ComposioModule | null> {
  try {
    const importer = new Function("specifier", "return import(specifier)") as (specifier: string) => Promise<Record<string, unknown>>;
    const mod = await importer("@composio/core");
    const Composio = mod.Composio as
      | (new (options: { apiKey: string }) => { create: (userId: string, config: object) => Promise<ComposioSession> })
      | undefined;
    const preset = (mod.SessionPreset as { DIRECT_TOOLS?: string } | undefined)?.DIRECT_TOOLS;
    const key = process.env.COMPOSIO_API_KEY;
    if (!Composio || !key) return null;
    const client = new Composio({ apiKey: key });
    return {
      async create(userId, config) {
        const { tenantUserId: _tenant, ...sessionConfig } = config;
        return client.create(userId, { ...sessionConfig, sessionPreset: preset ?? config.sessionPreset });
      },
    };
  } catch {
    return null;
  }
}
