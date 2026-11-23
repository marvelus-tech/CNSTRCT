import { orgo, OrgoError } from "./orgo";
import { deleteBusinessForUser, getBusiness, listAgents } from "../store";

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
 * Delete each Orgo computer before the local rows go away.
 * A 404 means it is already gone. Any other failure keeps every stored id so a retry can finish.
 */
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
  const computerIds = (await listAgents(businessId))
    .map((agent) => agent.orgoComputerId)
    .filter((id): id is string => Boolean(id));
  const cleanup = await cleanupOrgoComputers(computerIds);
  if (!cleanup.ok) return { ok: false as const, error: cleanup.error, computerIds: cleanup.remaining };
  const agentIds = await deleteBusinessForUser(userId, businessId);
  if (!agentIds) return { ok: false as const, error: "Business not found.", computerIds: [] as string[] };
  return { ok: true as const, agentIds };
}
