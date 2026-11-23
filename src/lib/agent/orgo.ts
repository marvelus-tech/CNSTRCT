/**
 * Slim Orgo HTTP client for BizOS server-side provisioning and sandbox bash.
 * Secrets never leave this module in logs — callers should redact errors.
 */

const BASE = "https://www.orgo.ai/api";

export type OrgoDesktop = {
  id: string;
  name: string;
  status?: string;
  os?: string;
  cpu?: number;
  ram?: number;
};

export type OrgoWorkspace = {
  id: string;
  name: string;
  status?: string;
  desktops?: OrgoDesktop[];
};

export class OrgoError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}

type OrgoJson = { error?: string; message?: string; code?: string };

async function readJson(response: Response): Promise<OrgoJson> {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as OrgoJson;
  } catch {
    return { error: text.slice(0, 200) };
  }
}

async function call<T>(
  method: string,
  path: string,
  body?: unknown,
  headers?: Record<string, string>,
): Promise<T> {
  const key = process.env.ORGO_API_KEY;
  if (!key) throw new OrgoError(401, "ORGO_API_KEY is not set");
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(60_000),
  });
  const json = await readJson(response);
  if (!response.ok) {
    const code = json.code ?? (typeof json.error === "string" ? json.error : undefined);
    throw new OrgoError(
      response.status,
      `Orgo ${method} ${path}: ${json.error || json.message || response.statusText}`,
      typeof code === "string" ? code : undefined,
    );
  }
  return json as T;
}

export function orgoWorkspaceName(businessId: string) {
  return `cnstrct-${businessId}`;
}

export const ORGO_DESK_COMPUTER = { name: "desk", cpu: 2, ram: 8, diskGb: 40 } as const;

export function orgoComputerIdempotencyKey(businessId: string) {
  return `cnstrct-orgo-${businessId}-desk`;
}

function nameEquals(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export function findWorkspaceByName(workspaces: OrgoWorkspace[], name: string) {
  return workspaces.find((item) => nameEquals(item.name, name)) ?? null;
}

export function findDesktopByName(workspaces: OrgoWorkspace[], workspaceId: string, computerName: string) {
  const workspace = workspaces.find((item) => item.id === workspaceId);
  const desktops = workspace?.desktops ?? [];
  return desktops.find((item) => nameEquals(item.name, computerName)) ?? null;
}

export const orgo = {
  listWorkspaces() {
    return call<{ workspaces: OrgoWorkspace[] }>("GET", "/workspaces");
  },
  createWorkspace(name: string) {
    return call<{ id: string; name: string; status?: string }>("POST", "/workspaces", { name });
  },
  deleteWorkspace(id: string) {
    return call<{ success?: boolean }>("DELETE", `/workspaces/${id}`);
  },
  createComputer(input: {
    workspaceId: string;
    name: string;
    idempotencyKey: string;
    cpu?: number;
    ram?: number;
    diskGb?: number;
  }) {
    const size = {
      cpu: input.cpu ?? ORGO_DESK_COMPUTER.cpu,
      ram: input.ram ?? ORGO_DESK_COMPUTER.ram,
      disk_size_gb: input.diskGb ?? ORGO_DESK_COMPUTER.diskGb,
    };
    return call<{ id: string; status: string }>("POST", "/computers", {
      workspace_id: input.workspaceId,
      name: input.name,
      os: "linux",
      ...size,
    }, { "Idempotency-Key": input.idempotencyKey });
  },
  getComputer(id: string) {
    return call<{ id: string; status?: string; name?: string; project_id?: string }>("GET", `/computers/${id}`);
  },
  resume(id: string) {
    return call<{ id: string; status?: string }>("POST", `/computers/${id}/resume`);
  },
  start(id: string) {
    return call<{ id: string; status?: string }>("POST", `/computers/${id}/start`);
  },
  bash(id: string, command: string) {
    return call<{ success: boolean; output: string; exit_code: number }>("POST", `/computers/${id}/bash`, {
      command,
      timeout: 30,
    });
  },
  deleteComputer(id: string) {
    return call<{ success?: boolean }>("DELETE", `/computers/${id}`);
  },
};