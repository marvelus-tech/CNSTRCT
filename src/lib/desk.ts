import { composioConfigured, computerState, connectionState, orgoConfigured } from "./agent/adapters";
import { mapSeq } from "./seq";
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

export async function loadDesk(userId: string, businessId?: string) {
  const user = await getUser(userId);
  if (!user) return null;
  const profile = await getProfile(userId);
  const loaded = businessId ? await getBusiness(businessId) : await getBusinessForUser(userId);
  const business = loaded && (!businessId || loaded.userId === userId) ? loaded : null;
  if (businessId && !business) return null;
  const agents = business
    ? await mapSeq(await ensureTeamShape(business.id), async (agent) => ({
        ...agent,
        tools: agent.tools,
        rows: await listRows(agent.id),
        routines: await listRoutines(agent.id),
        computer: await computerSnapshot(agent.id),
      }))
    : [];
  if (business && !(await listConnections(business.id)).some((item) => item.toolkit === "gmail")) {
    await upsertConnection({ businessId: business.id, toolkit: "gmail", status: "not_configured", connectedAccountId: null });
  }
  const keySet = composioConfigured();
  const orgoKey = orgoConfigured();
  return {
    user,
    profile,
    business,
    agents,
    leads: business ? await listLeads(business.id) : [],
    tasks: business ? await listTasks(business.id) : [],
    audit: business ? await listAudit(business.id, 12) : [],
    connections: {
      composioConfigured: keySet,
      apps: business
        ? (await listConnections(business.id)).map((item) => ({
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
      state:
        agent.role === "orchestrator"
          ? ("not_configured" as const)
          : business?.orgoComputerId
            ? ("connected" as const)
            : computerState(null, orgoKey),
      orgoComputerId: agent.role === "orchestrator" ? null : business?.orgoComputerId ?? null,
      size: agent.role === "orchestrator" ? ("none" as const) : business?.orgoComputerId ? ("Medium" as const) : ("Small" as const),
      localNote:
        agent.role === "orchestrator"
          ? `${agent.name} does not get an Orgo computer. Specialists share the business workspace VM.`
          : business?.orgoComputerId
            ? agent.computer.note
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

export type DeskPayload = NonNullable<Awaited<ReturnType<typeof loadDesk>>>;
