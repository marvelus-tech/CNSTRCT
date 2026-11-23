import { composioConfigured, composioUserId, GMAIL_MODEL_TOOLS, type DirectToolsSession } from "./adapters";
import { redactProvisioningError } from "./redact";
import type { Business } from "../types";

const API_BASE = "https://backend.composio.dev/api/v3.1";

export class ComposioError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

type ComposioJson = Record<string, unknown>;

async function readJson(response: Response): Promise<ComposioJson> {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as ComposioJson;
  } catch {
    return { error: text.slice(0, 200) };
  }
}

/** Low-level REST helper for deprovision paths that tests can stub via global fetch. */
export async function composioFetch<T>(method: string, path: string, body?: unknown): Promise<T> {
  const key = process.env.COMPOSIO_API_KEY;
  if (!key) throw new ComposioError(401, "COMPOSIO_API_KEY is not set");
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      "x-api-key": key,
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(60_000),
  });
  const json = await readJson(response);
  if (!response.ok) {
    const message =
      (typeof json.error === "string" && json.error) ||
      (typeof json.message === "string" && json.message) ||
      response.statusText;
    throw new ComposioError(response.status, `Composio ${method} ${path}: ${message}`);
  }
  return json as T;
}

export type ComposioSdk = Awaited<ReturnType<typeof loadComposioSdk>>;

async function loadComposioSdk() {
  const { Composio, SessionPreset } = await import("@composio/core");
  const key = process.env.COMPOSIO_API_KEY;
  if (!key) throw new ComposioError(401, "COMPOSIO_API_KEY is not set");
  return { composio: new Composio({ apiKey: key }), SessionPreset };
}

export async function withComposioSdk<T>(fn: (sdk: ComposioSdk) => Promise<T>): Promise<T> {
  const sdk = await loadComposioSdk();
  return fn(sdk);
}

export function directToolsSessionConfig(input: {
  businessId: string;
  toolkits?: string[];
  connectedAccountId?: string | null;
}): DirectToolsSession {
  const session: DirectToolsSession = {
    tenantUserId: composioUserId(input.businessId),
    sessionPreset: "direct_tools",
    manageConnections: { enable: false },
    sandbox: { enable: false },
    toolkits: { enable: input.toolkits ?? ["gmail"] },
    tools: { gmail: { enable: [...GMAIL_MODEL_TOOLS] } },
  };
  if (input.connectedAccountId) session.connectedAccounts = { gmail: [input.connectedAccountId] };
  return session;
}

export async function createDirectToolsSession(input: {
  businessId: string;
  toolkits?: string[];
  connectedAccountId?: string | null;
}): Promise<{ sessionId: string }> {
  const userId = composioUserId(input.businessId);
  return await withComposioSdk(async ({ composio, SessionPreset }) => {
    const session = await composio.sessions.create(userId, {
      sessionPreset: SessionPreset.DIRECT_TOOLS,
      toolkits: input.toolkits ?? ["gmail"],
      manageConnections: { enable: false },
      sandbox: { enable: false },
      tools: { gmail: { enable: [...GMAIL_MODEL_TOOLS] } },
      ...(input.connectedAccountId
        ? { connectedAccounts: { gmail: [input.connectedAccountId] } }
        : {}),
    });
    return { sessionId: session.sessionId };
  });
}

export async function startToolkitOAuth(input: {
  business: Business;
  toolkit: string;
  callbackUrl: string;
}): Promise<{ redirectUrl: string; sessionId: string }> {
  if (!input.business.composioUserId) {
    throw new ComposioError(400, "composio_user_id is missing on the business row.");
  }
  const { sessionId } = await createDirectToolsSession({
    businessId: input.business.id,
    toolkits: [input.toolkit],
    connectedAccountId: null,
  });
  const request = await withComposioSdk(async ({ composio }) => {
    const session = await composio.sessions.use(sessionId);
    return session.authorize(input.toolkit, { callbackUrl: input.callbackUrl });
  });
  const redirectUrl = request.redirectUrl;
  if (!redirectUrl) throw new ComposioError(502, "Composio did not return a redirect URL.");
  return { redirectUrl, sessionId };
}

export async function completeToolkitOAuth(input: {
  composioUserId: string;
  sessionUri: string;
}): Promise<{ connectedAccountId: string; toolkitSlug: string }> {
  return await withComposioSdk(async ({ composio }) => {
    const result = await composio.connectedAccounts.completeAuth({
      userId: input.composioUserId,
      sessionUri: input.sessionUri,
    });
    return {
      connectedAccountId: result.connectedAccountId,
      toolkitSlug: result.toolkitSlug,
    };
  });
}

type ConnectedAccountRow = { id?: string; nanoid?: string };

type ConnectedAccountList = {
  items?: ConnectedAccountRow[];
  connected_accounts?: ConnectedAccountRow[];
  data?: ConnectedAccountRow[];
  cursor?: string | null;
};

type TriggerList = { items?: { id: string }[]; trigger_instances?: { id: string }[] };

async function listAllConnectedAccounts(userId: string): Promise<string[]> {
  const ids: string[] = [];
  let cursor: string | null = null;
  for (let page = 0; page < 20; page += 1) {
    const query = new URLSearchParams({
      user_ids: userId,
      account_type: "ALL",
      limit: "200",
    });
    if (cursor) query.set("cursor", cursor);
    const json = await composioFetch<ConnectedAccountList>("GET", `/connected_accounts?${query.toString()}`);
    const rows = json.items ?? json.connected_accounts ?? json.data ?? [];
    for (const row of rows) {
      const id = row.id ?? row.nanoid;
      if (id) ids.push(String(id));
    }
    cursor = json.cursor ?? null;
    if (!cursor || rows.length === 0) break;
  }
  return ids;
}

async function deleteTriggersForAccount(accountId: string) {
  const json = await composioFetch<TriggerList>(
    "GET",
    `/trigger_instances/active?connected_account_ids=${encodeURIComponent(accountId)}&show_disabled=true`,
  );
  const rows = json.items ?? json.trigger_instances ?? [];
  for (const row of rows) {
    if (!row.id) continue;
    try {
      await composioFetch("DELETE", `/trigger_instances/manage/${encodeURIComponent(row.id)}`);
    } catch (error) {
      if (error instanceof ComposioError && error.status === 404) continue;
      throw error;
    }
  }
}

export async function deprovisionComposioTenant(input: {
  composioUserId: string;
  connectedAccountIds: string[];
  sessionIds: string[];
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!composioConfigured()) return { ok: true };
  try {
    const accountIds =
      input.connectedAccountIds.length > 0
        ? [...new Set(input.connectedAccountIds)]
        : await listAllConnectedAccounts(input.composioUserId);
    for (const accountId of accountIds) {
      await deleteTriggersForAccount(accountId);
      try {
        await composioFetch(
          "DELETE",
          `/connected_accounts/${encodeURIComponent(accountId)}?revoke_on_delete=true`,
        );
      } catch (error) {
        if (error instanceof ComposioError && error.status === 404) continue;
        throw error;
      }
    }
    for (const sessionId of input.sessionIds) {
      try {
        await composioFetch("DELETE", `/tool_router/session/${encodeURIComponent(sessionId)}`);
      } catch (error) {
        if (error instanceof ComposioError && error.status === 404) continue;
        throw error;
      }
    }
    return { ok: true };
  } catch (error) {
    const message = redactProvisioningError(error instanceof Error ? error.message : "Composio deprovision failed");
    return { ok: false, error: message };
  }
}

export function composioStubReason() {
  return composioConfigured() ? null : "COMPOSIO_API_KEY is not set";
}