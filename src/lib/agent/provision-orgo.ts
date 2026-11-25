/**
 * Orgo workspace + shared desk provisioning.
 * Template/theme mapping: docs/orgo-themes.md
 */
import { applyOrgoThemeForBusiness, orgoTemplateForCreate } from "./orgo-theme-apply";
import { ORGO_COMPUTER_NOTE } from "./provision";
import {
  findDesktopByName,
  findWorkspaceByName,
  orgo,
  OrgoError,
  orgoComputerIdempotencyKey,
  orgoWorkspaceName,
  ORGO_DESK_COMPUTER,
  type OrgoWorkspace,
} from "./orgo";
import { redactProvisioningError } from "./redact";
import { getBusiness, listAgents, setBusinessOrgoIds, upsertComputer } from "../store";
import type { Business } from "../types";

export type OrgoProvisionOutcome =
  | { kind: "succeeded"; workspaceId: string; computerId: string }
  | { kind: "retry"; reason: string }
  | { kind: "failed"; reason: string };

function workspaceTaken(code: string | undefined) {
  const normalized = (code ?? "").toLowerCase();
  return normalized === "workspace_name_taken" || normalized.includes("workspace_name_taken");
}

function nameTaken(code: string | undefined, status: number) {
  if (status !== 409) return false;
  const normalized = (code ?? "").toLowerCase();
  return normalized === "name_taken" || normalized.includes("name_taken");
}

function isRetryableOrgoError(error: OrgoError) {
  if (error.status === 429) return true;
  if (error.status >= 500) return true;
  const code = (error.code ?? "").toLowerCase();
  return (
    code.includes("rate_limited") ||
    code.includes("region_unavailable") ||
    code.includes("fleet_capacity") ||
    code.includes("free_hourly_busy")
  );
}

async function refreshWorkspaces(): Promise<OrgoWorkspace[]> {
  const list = await orgo.listWorkspaces();
  return list.workspaces ?? [];
}

async function ensureWorkspaceId(business: Business): Promise<string> {
  const name = orgoWorkspaceName(business.id);
  if (business.orgoWorkspaceId) {
    const workspaces = await refreshWorkspaces();
    const owned = workspaces.find((item) => item.id === business.orgoWorkspaceId);
    if (owned) return owned.id;
  }
  let workspaces = await refreshWorkspaces();
  const existing = findWorkspaceByName(workspaces, name);
  if (existing) return existing.id;
  try {
    const created = await orgo.createWorkspace(name);
    return created.id;
  } catch (error) {
    if (error instanceof OrgoError && workspaceTaken(error.code)) {
      workspaces = await refreshWorkspaces();
      const adopted = findWorkspaceByName(workspaces, name);
      if (adopted) return adopted.id;
    }
    throw error;
  }
}

async function ensureComputerId(workspaceId: string, business: Business, workspaces: OrgoWorkspace[]): Promise<string> {
  const existingDesk = findDesktopByName(workspaces, workspaceId, ORGO_DESK_COMPUTER.name);
  if (existingDesk?.id) return existingDesk.id;
  const idempotencyKey = orgoComputerIdempotencyKey(business.id);
  const template = orgoTemplateForCreate(business.templateId);
  try {
    const created = await orgo.createComputer({
      workspaceId,
      name: ORGO_DESK_COMPUTER.name,
      idempotencyKey,
      template,
    });
    return created.id;
  } catch (error) {
    if (error instanceof OrgoError && nameTaken(error.code, error.status)) {
      const refreshed = await refreshWorkspaces();
      const adopted = findDesktopByName(refreshed, workspaceId, ORGO_DESK_COMPUTER.name);
      if (adopted?.id) return adopted.id;
    }
    throw error;
  }
}

async function finalizeTheme(business: Business, computerId: string): Promise<OrgoProvisionOutcome | null> {
  const applied = await applyOrgoThemeForBusiness(business, computerId);
  if (applied.ok) return null;
  if (applied.retry) return { kind: "retry", reason: applied.reason };
  return { kind: "failed", reason: applied.reason };
}

async function verifyComputer(computerId: string) {
  const info = await orgo.getComputer(computerId);
  if ((info.status ?? "").toLowerCase() === "deleted") {
    throw new OrgoError(410, "Orgo computer is deleted", "deleted");
  }
  return info;
}

/** Idempotent Orgo desk for one business: workspace cnstrct-{id}, computer desk (2 vCPU / 8 GB). */
export async function provisionOrgoForBusiness(businessId: string): Promise<OrgoProvisionOutcome> {
  const business = await getBusiness(businessId);
  if (!business) return { kind: "failed", reason: "Business row missing." };
  if (business.orgoWorkspaceId && business.orgoComputerId) {
    try {
      await verifyComputer(business.orgoComputerId);
      const themeBlock = await finalizeTheme(business, business.orgoComputerId);
      if (themeBlock) return themeBlock;
      return {
        kind: "succeeded",
        workspaceId: business.orgoWorkspaceId,
        computerId: business.orgoComputerId,
      };
    } catch (error) {
      if (error instanceof OrgoError && error.status === 404) {
        await setBusinessOrgoIds(businessId, { orgoComputerId: null });
      } else if (error instanceof OrgoError && isRetryableOrgoError(error)) {
        return { kind: "retry", reason: redactProvisioningError(error.message) };
      } else if (error instanceof OrgoError) {
        return { kind: "failed", reason: redactProvisioningError(error.message) };
      }
      throw error;
    }
  }
  try {
    const workspaceId = await ensureWorkspaceId(business);
    await setBusinessOrgoIds(businessId, { orgoWorkspaceId: workspaceId });
    const workspaces = await refreshWorkspaces();
    const fresh = await getBusiness(businessId);
    if (!fresh) return { kind: "failed", reason: "Business row missing." };
    const computerId = await ensureComputerId(workspaceId, fresh, workspaces);
    await setBusinessOrgoIds(businessId, { orgoComputerId: computerId });
    await syncSpecialistComputerRows(businessId);
    const themeBlock = await finalizeTheme(fresh, computerId);
    if (themeBlock) return themeBlock;
    return { kind: "succeeded", workspaceId, computerId };
  } catch (error) {
    if (error instanceof OrgoError) {
      const message = redactProvisioningError(error.message);
      if (isRetryableOrgoError(error)) return { kind: "retry", reason: message };
      return { kind: "failed", reason: message };
    }
  }
  return { kind: "failed", reason: "Orgo provisioning failed." };
}

async function syncSpecialistComputerRows(businessId: string) {
  const agents = await listAgents(businessId);
  for (const agent of agents) {
    if (agent.role === "orchestrator") continue;
    await upsertComputer(agent.id, "orgo", "connected", ORGO_COMPUTER_NOTE);
  }
}