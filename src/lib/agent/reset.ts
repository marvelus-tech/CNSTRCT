import { orgo, OrgoError, orgoWorkspaceName } from "./orgo";
import { deleteBusinessForUser, getBusiness, listAgents, setBusinessOrgoIds } from "../store";

function computerId(id: string) {
  return /^[A-Za-z0-9_-]+$/.test(id);
}

function redact(message: string) {
  let text = message;
  const key = process.env.ORGO_API_KEY;
  if (key) text = text.split(key).join("[redacted]");
  return text.replace(/Bearer\s+\S+/gi, "Bearer [redacted]").replace(/\bsk_[A-Za-z0-9_-]+\b/g, "[redacted]");
}

/**
 * Delete the business Orgo desk computer, then the workspace when it has no other desktops.
 */
export async function cleanupOrgoBusiness(businessId: string): Promise<
  { ok: true; computerIds: string[] } | { ok: false; error: string; computerIds: string[] }
> {
  const business = await getBusiness(businessId);
  if (!business) return { ok: true, computerIds: [] };
  const computerIds = business.orgoComputerId ? [business.orgoComputerId] : [];
  const legacyIds = (await listAgents(businessId))
    .map((agent) => agent.orgoComputerId)
    .filter((id): id is string => Boolean(id));
  const uniqueComputerIds = [...new Set([...computerIds, ...legacyIds])];
  if (uniqueComputerIds.length === 0) return { ok: true, computerIds: [] };
  if (uniqueComputerIds.some((id) => !computerId(id))) {
    return {
      ok: false,
      error: "An Orgo computer id is not safe to send. This business was kept.",
      computerIds: uniqueComputerIds,
    };
  }
  if (!process.env.ORGO_API_KEY) {
    return {
      ok: false,
      error: "Orgo computers are still recorded, and no API key is set, so they were not removed. This business was kept.",
      computerIds: uniqueComputerIds,
    };
  }
  const remaining = [...uniqueComputerIds];
  for (const id of uniqueComputerIds) {
    try {
      await orgo.deleteComputer(id);
      remaining.splice(remaining.indexOf(id), 1);
    } catch (error) {
      if (error instanceof OrgoError && error.status === 404) {
        remaining.splice(remaining.indexOf(id), 1);
        continue;
      }
      const detail = redact(error instanceof Error ? error.message : "Orgo cleanup failed");
      return {
        ok: false,
        error: `Could not remove Orgo computer ${id}. This business was kept so you can retry. ${detail}`,
        computerIds: remaining,
      };
    }
  }
  const workspaceId = business.orgoWorkspaceId;
  if (workspaceId) {
    try {
      const list = await orgo.listWorkspaces();
      const workspace = list.workspaces?.find((item) => item.id === workspaceId);
      const desktops = workspace?.desktops ?? [];
      if (desktops.length === 0) {
        await orgo.deleteWorkspace(workspaceId);
      }
    } catch (error) {
      if (!(error instanceof OrgoError && error.status === 404)) {
        const detail = redact(error instanceof Error ? error.message : "Orgo workspace cleanup failed");
        return {
          ok: false,
          error: `Desk computer removed, but the workspace could not be deleted. This business was kept so you can retry. ${detail}`,
          computerIds: [],
        };
      }
    }
    await setBusinessOrgoIds(businessId, { orgoWorkspaceId: null, orgoComputerId: null });
  }
  return { ok: true, computerIds: uniqueComputerIds };
}

/** Legacy helper: validates ids and deletes each computer without workspace teardown. */
export async function cleanupOrgoComputers(ids: string[]): Promise<{ ok: true } | { ok: false; error: string; remaining: string[] }> {
  if (ids.length === 0) return { ok: true };
  if (ids.some((id) => !computerId(id))) {
    return { ok: false, error: "An Orgo computer id is not safe to send. This business was kept.", remaining: ids };
  }
  if (!process.env.ORGO_API_KEY) {
    return {
      ok: false,
      error: "Orgo computers are still recorded, and no API key is set, so they were not removed. This business was kept.",
      remaining: ids,
    };
  }
  const remaining = [...ids];
  for (const id of ids) {
    try {
      await orgo.deleteComputer(id);
      remaining.splice(remaining.indexOf(id), 1);
    } catch (error) {
      if (error instanceof OrgoError && error.status === 404) {
        remaining.splice(remaining.indexOf(id), 1);
        continue;
      }
      const detail = redact(error instanceof Error ? error.message : "Orgo cleanup failed");
      return {
        ok: false,
        error: `Could not remove Orgo computer ${id}. This business was kept so you can retry. ${detail}`,
        remaining,
      };
    }
  }
  return { ok: true };
}

export async function resetBusiness(userId: string, businessId: string) {
  const business = await getBusiness(businessId);
  if (!business || business.userId !== userId) return { ok: false as const, error: "Business not found.", computerIds: [] as string[] };
  const cleanup = await cleanupOrgoBusiness(businessId);
  if (!cleanup.ok) return { ok: false as const, error: cleanup.error, computerIds: cleanup.computerIds };
  const agentIds = await deleteBusinessForUser(userId, businessId);
  if (!agentIds) return { ok: false as const, error: "Business not found.", computerIds: [] as string[] };
  return { ok: true as const, agentIds, computerIds: cleanup.computerIds };
}

export function expectedWorkspaceName(businessId: string) {
  return orgoWorkspaceName(businessId);
}