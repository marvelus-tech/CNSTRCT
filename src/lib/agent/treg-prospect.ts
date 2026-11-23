import { newId } from "../ids";
import { recordAudit } from "../store";
import { tregCall, tregConfigured, type TregCallResult } from "./treg";

export type ProspectFeature =
  | "companies-search"
  | "companies-enrich"
  | "people-search"
  | "email-find"
  | "email-verify";

const ENDPOINT: Record<ProspectFeature, string> = {
  "companies-search": "treg.companies.search",
  "companies-enrich": "treg.companies.enrich",
  "people-search": "treg.people.search",
  "email-find": "treg.people.email.find",
  "email-verify": "treg.people.email.verify",
};

export function prospectConfigured() {
  return tregConfigured();
}

export async function runProspectCall(input: {
  businessId: string;
  userId: string;
  feature: ProspectFeature;
  body: Record<string, unknown>;
  idempotencyKey?: string;
}): Promise<TregCallResult & { endpointId: string }> {
  const endpointId = ENDPOINT[input.feature];
  const idempotencyKey = input.idempotencyKey ?? newId("treg");
  const result = await tregCall({
    businessId: input.businessId,
    endpointId,
    feature: input.feature,
    body: input.body,
    idempotencyKey,
  });
  await recordAudit({
    businessId: input.businessId,
    userId: input.userId,
    agentId: null,
    actor: `user:${input.userId}`,
    kind: "treg.call",
    tool: endpointId,
    decision: result.ok ? "ok" : "error",
    summary: result.ok
      ? `Treg ${input.feature} (${result.costMicro ?? 0} micro)`
      : `Treg ${input.feature} refused: ${result.error ?? result.status}`,
    refId: result.callId,
  });
  return { ...result, endpointId };
}