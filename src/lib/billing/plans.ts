export type PlanId = "starter" | "pro";

export type PlanDefinition = {
  id: PlanId;
  label: string;
  priceUsd: number;
  maxBusinesses: number;
  tokenCredits: number;
  computerHours: number;
  agentCount: number;
};

export const PLANS: Record<PlanId, PlanDefinition> = {
  starter: {
    id: "starter",
    label: "Starter",
    priceUsd: 39,
    maxBusinesses: 1,
    tokenCredits: 400_000,
    computerHours: 4,
    agentCount: 3,
  },
  pro: {
    id: "pro",
    label: "Pro",
    priceUsd: 79,
    maxBusinesses: 3,
    tokenCredits: 1_200_000,
    computerHours: 12,
    agentCount: 3,
  },
};

export function planFromId(id: string | null | undefined): PlanDefinition | null {
  if (id === "starter" || id === "pro") return PLANS[id];
  return null;
}

export const OVERAGE_COPY =
  "Usage is metered. Overage: $12 per 100k agent-work credits and $4 per extra computer hour. Credits reset each billing period.";