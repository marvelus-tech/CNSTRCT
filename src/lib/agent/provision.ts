import { businessName, cityOf, type TemplateId } from "../copy";
import { newId } from "../ids";
import {
  getAgent,
  getBusiness,
  insertAgent,
  insertBusiness,
  insertLead,
  insertRoutine,
  listAgents,
  recordAudit,
  setAgentOrgoComputer,
  setAgentInstructions,
  setAgentName,
  setAgentSpecialty,
  setAgentTools,
  setBusinessWorkspace,
  slugTaken,
  upsertComputer,
  upsertConnection,
} from "../store";
import type { Agent, Business, Profile } from "../types";
import { ORGO_SMALL, orgoConfigured } from "./adapters";
import { blueprintFor, validateBlueprint, type BusinessBlueprint, type BlueprintContext } from "./blueprint";
import { orgo } from "./orgo";
import { ensureWorkspace } from "./sandbox";

export const LOCAL_COMPUTER_NOTE =
  "Orgo is not connected. This folder is a local sandbox, not an Orgo computer.";
export const ORGO_COMPUTER_NOTE =
  "Orgo Small computer (0.5 vCPU, 4 GB RAM, 20 GB disk). App secrets are not on this VM.";

function slugify(input: string) {
  const base = input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return base || "desk";
}

function uniqueSlug(name: string) {
  const base = slugify(name);
  if (!slugTaken(base)) return base;
  return `${base}-${newId("s").slice(-4)}`;
}

function textOf(value: string | ((ctx: BlueprintContext) => string), ctx: BlueprintContext) {
  return typeof value === "function" ? value(ctx) : value;
}

export async function provisionBlueprint(
  userId: string,
  profile: Profile,
  blueprint: BusinessBlueprint,
  name?: string,
): Promise<{ business: Business; agents: Agent[] }> {
  const check = validateBlueprint(blueprint);
  if (!check.ok) throw new Error(check.reason);
  const city = cityOf(profile.location);
  const businessNameText = name ?? `${city} Desk`;
  const ctx: BlueprintContext = { city, businessName: businessNameText };
  const business = insertBusiness({
    userId,
    templateId: blueprint.templateId,
    name: businessNameText,
    slug: uniqueSlug(businessNameText),
    city,
    profileJson: JSON.stringify(profile),
    orgoWorkspaceId: null,
  });

  const agents: Agent[] = [];
  for (const role of blueprint.roles) {
    const agent = insertAgent({
      businessId: business.id,
      userId,
      role: role.role,
      name: role.name,
      title: role.title,
      specialty: role.specialty,
      instructions: role.instructions(ctx),
      status: "active",
      tools: role.tools,
    });
    ensureWorkspace(agent.id);
    upsertComputer(agent.id, "local", "not_connected", LOCAL_COMPUTER_NOTE);
    for (const routine of role.routines) {
      insertRoutine({
        agentId: agent.id,
        name: routine.name,
        prompt: textOf(routine.prompt, ctx),
        scheduleLabel: routine.scheduleLabel,
        intervalMs: routine.intervalMs,
        enabled: true,
        nextRunAt: Date.now() + routine.intervalMs,
      });
    }
    agents.push(agent);
  }

  const lead = blueprint.exampleLead(city);
  insertLead({
    businessId: business.id,
    name: lead.name,
    phone: lead.phone,
    address: lead.address,
    service: lead.service,
    source: "example",
  });
  upsertConnection({
    businessId: business.id,
    toolkit: "gmail",
    status: "not_configured",
    connectedAccountId: null,
  });
  recordAudit({
    businessId: business.id,
    userId,
    actor: "owner",
    kind: "team.provisioned",
    summary: `Provisioned ${agents.map((agent) => agent.name).join(", ")}. Routines are planned, not running.`,
  });
  await provisionOrgo(business, agents);
  return {
    business: { ...business, orgoWorkspaceId: business.orgoWorkspaceId ?? null },
    agents: agents.map((agent) => getAgent(agent.id) ?? agent),
  };
}

export async function openDesk(
  userId: string,
  profile: Profile,
  templateId: TemplateId | string = "home-services",
): Promise<{ business: Business; agents: Agent[] }> {
  const blueprint = blueprintFor(templateId);
  if (!blueprint) throw new Error("No blueprint for that template.");
  const name = businessName(profile, templateId as TemplateId);
  return provisionBlueprint(userId, profile, blueprint, name);
}

/**
 * Older desks have scout and matcher only. Add Bizzie so the workspace still has one owner thread.
 * A business with zero agents (the seeded public sample) is left alone.
 */
export function ensureTeamShape(businessId: string): Agent[] {
  const business = getBusiness(businessId);
  if (!business) return [];
  let agents = listAgents(businessId);
  if (agents.length === 0) return agents;
  const blueprint = blueprintFor(business.templateId);
  if (!agents.some((agent) => agent.role === "orchestrator")) {
    const role = blueprint?.roles.find((item) => item.role === "orchestrator");
    const ctx: BlueprintContext = { city: business.city, businessName: business.name };
    let created;
    try {
      created = insertAgent({
        businessId: business.id,
        userId: business.userId,
        role: "orchestrator",
        name: role?.name ?? "Bizzie",
        title: role?.title ?? "Chief of staff",
        specialty: role?.specialty ?? "Routes the owner's requests to the specialists",
        instructions: role
          ? role.instructions(ctx)
          : "You are the only agent the owner messages. Delegate work. Do not send, spend, or use a computer.",
        status: "active",
        tools: role?.tools ?? ["delegate", "list_leads"],
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (!message.includes("UNIQUE")) throw error;
      return listAgents(businessId);
    }
    const routine = role?.routines[0];
    insertRoutine({
      agentId: created.id,
      name: routine?.name ?? "Morning owner brief",
      prompt: routine ? textOf(routine.prompt, ctx) : "Summarize queued specialist work. Do not send anything.",
      scheduleLabel: routine?.scheduleLabel ?? "Every morning",
      intervalMs: routine?.intervalMs ?? 86_400_000,
      enabled: true,
      nextRunAt: Date.now() + (routine?.intervalMs ?? 86_400_000),
    });
    ensureWorkspace(created.id);
    upsertComputer(created.id, "local", "not_connected", LOCAL_COMPUTER_NOTE);
    recordAudit({
      businessId: business.id,
      userId: business.userId,
      agentId: created.id,
      actor: "orchestrator",
      kind: "team.backfilled",
      summary: `Added ${created.name} so this existing desk has an owner-facing orchestrator.`,
    });
    agents = listAgents(businessId);
  }
  const ctx: BlueprintContext = { city: business.city, businessName: business.name };
  if (blueprint) {
    for (const agent of agents) {
      const role = blueprint.roles.find((item) => item.role === agent.role);
      if (!role) continue;
      if (agent.role === "orchestrator" && agent.name === "Quinn") {
        setAgentName(agent.id, "Bizzie");
        setAgentInstructions(agent.id, role.instructions(ctx));
      }
      if (!agent.specialty) setAgentSpecialty(agent.id, role.specialty);
      if (!agent.tools.length) setAgentTools(agent.id, role.tools);
    }
  }
  return listAgents(businessId);
}

async function provisionOrgo(business: Business, agents: Agent[]) {
  if (!orgoConfigured()) return;
  const specialists = agents.filter((agent) => agent.role !== "orchestrator");
  try {
    let workspaceId = business.orgoWorkspaceId || "";
    if (!workspaceId) {
      const created = await orgo.createWorkspace(`cnstrct-${business.id}`);
      workspaceId = created.id;
      setBusinessWorkspace(business.id, workspaceId);
    }
    for (const agent of specialists) {
      const name = `${agent.role}-${agent.id.slice(-8)}`.slice(0, 80);
      const computer = await orgo.createComputer({ workspaceId, name });
      setAgentOrgoComputer(agent.id, computer.id);
      upsertComputer(agent.id, "orgo", "connected", ORGO_COMPUTER_NOTE);
      recordAudit({
        businessId: business.id,
        userId: business.userId,
        agentId: agent.id,
        actor: agent.role,
        kind: "computer.created",
        summary: `${agent.name} has Orgo computer ${computer.id} (${ORGO_SMALL.label}). Secrets were not synced.`,
        refId: computer.id,
      });
    }
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Orgo create failed";
    recordAudit({
      businessId: business.id,
      userId: business.userId,
      actor: "owner",
      kind: "computer.create_failed",
      summary: `Orgo computer was not created. ${detail}`,
    });
  }
}
