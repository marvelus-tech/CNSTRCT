import { composioConfigured, computerState, connectionState, GMAIL_MODEL_TOOLS, orgoConfigured } from "./agent/adapters";
import { toolsForRole } from "./agent/blueprint";
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
        tools: toolsForRole(agent.role),
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
      scopes: [
        { role: "orchestrator" as const, session: "direct_tools", tools: [] as string[] },
        { role: "scout" as const, session: "direct_tools", tools: [...GMAIL_MODEL_TOOLS] },
        { role: "matcher" as const, session: "direct_tools", tools: [...GMAIL_MODEL_TOOLS] },
      ],
    },
    computers: agents.map((agent) => ({
      agentId: agent.id,
      name: agent.name,
      role: agent.role,
      state: computerState(agent.orgoComputerId, orgoKey),
      orgoComputerId: agent.orgoComputerId,
      size: "Small" as const,
      localNote: agent.computer.note,
    })),
    modelMode: modelMode(),
    composioConfigured: keySet,
    limits: { tokens: TOKEN_LIMIT, computerSeconds: COMPUTER_LIMIT_SECONDS },
  };
}

export type DeskPayload = NonNullable<ReturnType<typeof loadDesk>>;
