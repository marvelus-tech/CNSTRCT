import { composioConfigured, computerState, connectionState, orgoConfigured } from "./agent/adapters";
import { COMPUTER_LIMIT_SECONDS, TOKEN_LIMIT } from "./agent/limits";
import { modelMode } from "./agent/model";
import { ensureTeamShape } from "./agent/provision";
import { computerSnapshot } from "./agent/sandbox";
import {
  getBusiness,
  getBusinessForUser,
  getProfile,
  getUser,
  listAudit,
  listConnections,
  listLeads,
  listRoutines,
  listRows,
  listTasks,
  upsertConnection,
} from "./store";

export function loadDesk(userId: string, businessId?: string) {
  const user = getUser(userId);
  if (!user) return null;
  const profile = getProfile(userId);
  const business = businessId
    ? (() => {
        const row = getBusiness(businessId);
        if (!row || row.userId !== userId) return null;
        return row;
      })()
  : getBusinessForUser(userId);
  if (businessId && !business) return null;
  const agents = business
    ? ensureTeamShape(business.id).map((agent) => ({
        ...agent,
        tools: agent.tools,
        rows: listRows(agent.id),
        routines: listRoutines(agent.id),
        computer: computerSnapshot(agent.id),
      }))
    : [];
  if (business && !listConnections(business.id).some((item) => item.toolkit === "gmail")) {
    upsertConnection({ businessId: business.id, toolkit: "gmail", status: "not_configured", connectedAccountId: null });
  }
  const keySet = composioConfigured();
  const orgoKey = orgoConfigured();
  return {
    user,
    profile,
    business,
    agents,
    leads: business ? listLeads(business.id) : [],
    tasks: business ? listTasks(business.id) : [],
    audit: business ? listAudit(business.id, 12) : [],
    connections: {
      composioConfigured: keySet,
      apps: business
        ? listConnections(business.id).map((item) => ({
            toolkit: item.toolkit,
            state: connectionState({
              keySet,
              connectedAccountId: item.connectedAccountId,
              storedStatus: item.status,
            }),
            connectedAccountId: item.connectedAccountId,
          }))
        : [],
      scopes: (["orchestrator", "scout", "matcher"] as const).map((role) => ({
        role,
        session: "direct_tools",
        tools: [] as string[],
        note: "Gmail send is not available in this MVP.",
      })),
    },
    computers: agents.map((agent) => ({
      agentId: agent.id,
      name: agent.name,
      role: agent.role,
      state: agent.orgoComputerId
        ? ("connected" as const)
        : agent.role === "orchestrator"
          ? ("not_configured" as const)
          : computerState(null, orgoKey),
      orgoComputerId: agent.orgoComputerId,
      size: agent.role === "orchestrator" ? ("none" as const) : ("Small" as const),
      localNote:
        agent.role === "orchestrator"
          ? `${agent.name} does not get an Orgo computer.`
          : agent.computer.note,
      terminal: agent.computer.terminal,
      files: agent.computer.files,
      computerSeconds: agent.computerSeconds,
      tokensUsed: agent.tokensUsed,
    })),
    modelMode: modelMode(),
    composioConfigured: keySet,
    limits: { tokens: TOKEN_LIMIT, computerSeconds: COMPUTER_LIMIT_SECONDS },
  };
}

export type DeskPayload = NonNullable<ReturnType<typeof loadDesk>>;
