/**
 * Server-only Treg HTTP client. Token never leaves this module in logs.
 * Call proxy uses X-Treg-Token, not Authorization (Authorization forwards to providers).
 */

import { tregCustomerTag } from "./adapters";
import { redactProvisioningError } from "./redact";

const BASE = "https://treg.to";

/** Per-business daily spend ceiling ($5). */
export const TREG_DAILY_CAP_MICRO = 5_000_000;

/** Advisory call count rail per customer tag. */
export const TREG_CALLS_PER_DAY = 200;

export const TREG_ROUTE_MAX_COST_MICRO: Record<string, number> = {
  "treg.companies.search": 300_000,
  "treg.companies.enrich": 250_000,
  "treg.people.search": 100_000,
  "treg.people.email.find": 150_000,
  "treg.people.email.verify": 34_000,
};

export type TregBudgetBody = {
  daily_cap_micro: number;
  calls_per_day: number;
  note?: string;
};

export type TregCallResult = {
  ok: boolean;
  status: number;
  output: unknown;
  callId: string | null;
  costMicro: number | null;
  servedBy: string | null;
  error: string | null;
};

export class TregError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}

export function tregConfigured() {
  return Boolean(process.env.TREG_TOKEN && process.env.TREG_ORG_ID);
}

function token() {
  const value = process.env.TREG_TOKEN;
  if (!value) throw new TregError(401, "TREG_TOKEN is not set");
  return value;
}

function orgId() {
  const value = process.env.TREG_ORG_ID;
  if (!value) throw new TregError(401, "TREG_ORG_ID is not set");
  return value;
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { error: text.slice(0, 200) };
  }
}

export function tregMetaHeader(customerTag: string, feature: string) {
  return `customer=${customerTag},feature=${feature}`;
}

export function defaultBudgetBody(tag: string): TregBudgetBody {
  return {
    daily_cap_micro: TREG_DAILY_CAP_MICRO,
    calls_per_day: TREG_CALLS_PER_DAY,
    note: `BizOS customer ${tag}`,
  };
}

/** Idempotent customer tag budget for one business. */
export async function putCustomerBudget(customerTag: string, body: TregBudgetBody = defaultBudgetBody(customerTag)) {
  const path = `/orgs/${orgId()}/budgets/customer/${encodeURIComponent(customerTag)}`;
  const response = await fetch(`${BASE}${path}`, {
    method: "PUT",
    headers: {
      "X-Treg-Token": token(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60_000),
  });
  const json = await readJson(response);
  if (!response.ok) {
    const code = typeof json.code === "string" ? json.code : typeof json.error === "string" ? json.error : undefined;
    throw new TregError(
      response.status,
      redactProvisioningError(`Treg PUT budget: ${json.error ?? json.message ?? response.statusText}`),
      code,
    );
  }
  return json;
}

export function isRetryableTregError(error: TregError) {
  return error.status === 429 || error.status >= 500;
}

type CallInput = {
  businessId: string;
  endpointId: string;
  feature: string;
  body: Record<string, unknown>;
  idempotencyKey: string;
  routeMaxCostMicro?: number;
};

/** Routed catalog call with tenant meta and cost ceiling asserted by the server. */
export async function tregCall(input: CallInput): Promise<TregCallResult> {
  const customer = tregCustomerTag(input.businessId);
  const maxCost = input.routeMaxCostMicro ?? TREG_ROUTE_MAX_COST_MICRO[input.endpointId] ?? 1_000_000;
  const response = await fetch(`${BASE}/call/${input.endpointId}`, {
    method: "POST",
    headers: {
      "X-Treg-Token": token(),
      "Content-Type": "application/json",
      "X-Treg-Meta": tregMetaHeader(customer, input.feature),
      "X-Treg-Route-Max-Cost": String(maxCost),
      "Idempotency-Key": input.idempotencyKey,
      "Cache-Control": "no-cache",
    },
    body: JSON.stringify(input.body),
    signal: AbortSignal.timeout(60_000),
  });
  const callId = response.headers.get("X-Treg-Call-Id");
  const costHeader = response.headers.get("X-Treg-Cost-Micro");
  const servedBy = response.headers.get("X-Treg-Served-By");
  const costMicro = costHeader == null ? null : Number.parseInt(costHeader, 10);
  const json = await readJson(response);
  if (!response.ok) {
    const code = typeof json.code === "string" ? json.code : undefined;
    return {
      ok: false,
      status: response.status,
      output: json,
      callId,
      costMicro: Number.isFinite(costMicro) ? costMicro : null,
      servedBy,
      error: redactProvisioningError(
        typeof json.error === "string" ? json.error : typeof json.message === "string" ? json.message : code ?? response.statusText,
      ),
    };
  }
  const output = "output" in json ? json.output : json;
  return {
    ok: true,
    status: response.status,
    output,
    callId,
    costMicro: Number.isFinite(costMicro) ? costMicro : null,
    servedBy,
    error: null,
  };
}