export type PlanId = "starter" | "pro" | "scale";

export type PlanDefinition = {
  id: PlanId;
  label: string;
  priceUsd: number;
  maxBusinesses: number;
  tokenCredits: number;
  computerHours: number;
  agentCount: number;
};

export const LANDING_PLAN_ORDER: PlanId[] = ["starter", "pro", "scale"];

export const PLANS: Record<PlanId, PlanDefinition> = {
  starter: {
    id: "starter",
    label: "Starter",
    priceUsd: 75,
    maxBusinesses: 1,
    tokenCredits: 400_000,
    computerHours: 4,
    agentCount: 3,
  },
  pro: {
    id: "pro",
    label: "Pro",
    priceUsd: 149,
    maxBusinesses: 3,
    tokenCredits: 1_200_000,
    computerHours: 12,
    agentCount: 3,
  },
  scale: {
    id: "scale",
    label: "Scale",
    priceUsd: 400,
    maxBusinesses: 10,
    tokenCredits: 4_000_000,
    computerHours: 40,
    agentCount: 5,
  },
};

/** Landing pricing bullets; sentence-case HUD copy per tier. */
export function landingDigitalWorkersCopy(plan: PlanDefinition): string {
  if (plan.id === "starter") return `${plan.agentCount} digital workers`;
  if (plan.id === "pro") return "up to 3 digital workers per Biz";
  return "up to 5 digital workers per Biz";
}

export function planFromId(id: string | null | undefined): PlanDefinition | null {
  if (id === "starter" || id === "pro" || id === "scale") return PLANS[id];
  return null;
}

export const OVERAGE_COPY =
  "Usage is metered. Overage: $12 per 100k agent-work credits and $4 per extra computer hour. Credits reset each billing period.";