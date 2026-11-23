import { businessName, cityOf, type TemplateId } from "../copy";
import { mapSeq } from "../seq";
import { newId } from "../ids";
import type { Business as BusinessRow } from "../types";
import {
  getAgent,
  getBusiness,
  getBusinessByCreateIdempotencyKey,
  insertAgent,
  insertBusinessWithProvisioningJobs,
  insertLead,
  insertRoutine,
  listAgents,
  recordAudit,
  setAgentInstructions,
  setAgentName,
  setAgentSpecialty,
  setAgentTools,
  slugTaken,
  upsertComputer,
  upsertConnection,
} from "../store";
import type { Agent, Business, Profile } from "../types";
import { composioUserId, tregCustomerTag } from "./adapters";
import { PROVISIONING_PROVIDERS } from "./provisioning";
import { blueprintFor, validateBlueprint, type BusinessBlueprint, type BlueprintContext } from "./blueprint";
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

async function uniqueSlug(name: string) {
  const base = slugify(name);
  if (!await slugTaken(base)) return base;
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
  createIdempotencyKey?: string | null,
): Promise<{ business: Business; agents: Agent[] }> {
  const check = validateBlueprint(blueprint);
  if (!check.ok) throw new Error(check.reason);
  const city = cityOf(profile.location);
  const businessNameText = name ?? `${city} Desk`;
  const ctx: BlueprintContext = { city, businessName: businessNameText };
  const businessId = newId("biz");
  const composioId = composioUserId(businessId);
  const tregTag = tregCustomerTag(businessId);
  const business = await insertBusinessWithProvisioningJobs(
    {
      id: businessId,
      userId,
      templateId: blueprint.templateId,
      name: businessNameText,
      slug: await uniqueSlug(businessNameText),
      city,
      profileJson: JSON.stringify(profile),
      orgoWorkspaceId: null,
      orgoComputerId: null,
      composioUserId: composioId,
      tregCustomerTag: tregTag,
      provisionStatus: "pending",
      provisionError: null,
      createIdempotencyKey: createIdempotencyKey ?? null,
    } satisfies Omit<BusinessRow, "createdAt">,
    PROVISIONING_PROVIDERS,
  );

  const agents: Agent[] = [];
  for (const role of blueprint.roles) {
    const agent = await insertAgent({
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
    await upsertComputer(agent.id, "local", "not_connected", LOCAL_COMPUTER_NOTE);
    for (const routine of role.routines) {
      await insertRoutine({
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
  await insertLead({
    businessId: business.id,
    name: lead.name,
    phone: lead.phone,
    address: lead.address,
    service: lead.service,
    source: "example",
  });
  await upsertConnection({
    businessId: business.id,
    toolkit: "gmail",
    status: "not_configured",
    connectedAccountId: null,
  });
  await recordAudit({
    businessId: business.id,
    userId,
    actor: "owner",
    kind: "team.provisioned",
    summary: `Provisioned ${agents.map((agent) => agent.name).join(", ")}. Routines are planned, not running.`,
  });
  return {
    business,
    agents: await mapSeq(agents, async (agent) => await getAgent(agent.id) ?? agent),
  };
}

export async function openDesk(
  userId: string,
  profile: Profile,
  templateId: TemplateId | string = "home-services",
  createIdempotencyKey?: string | null,
): Promise<{ business: Business; agents: Agent[] }> {
  if (createIdempotencyKey) {
    const existing = await getBusinessByCreateIdempotencyKey(userId, createIdempotencyKey);
    if (existing) {
      return { business: existing, agents: await listAgents(existing.id) };
    }
  }
  const blueprint = blueprintFor(templateId);
  if (!blueprint) throw new Error("No blueprint for that template.");
  const name = businessName(profile, templateId as TemplateId);
  return await provisionBlueprint(userId, profile, blueprint, name, createIdempotencyKey);
}

/**
 * Older desks have scout and matcher only. Add Bizzie so the workspace still has one owner thread.
 * A business with zero agents (the seeded public sample) is left alone.
 */
export async function ensureTeamShape(businessId: string): Promise<Agent[]> {
  const business = await getBusiness(businessId);
  if (!business) return [];
  let agents = await listAgents(businessId);
  if (agents.length === 0) return agents;
  const blueprint = blueprintFor(business.templateId);
  if (!agents.some((agent) => agent.role === "orchestrator")) {
    const role = blueprint?.roles.find((item) => item.role === "orchestrator");
    const ctx: BlueprintContext = { city: business.city, businessName: business.name };
    let created;
    try {
      created = await insertAgent({
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
      // SQLite says "UNIQUE constraint failed". Postgres says "duplicate key".
      if (!/unique|duplicate key/i.test(message)) throw error;
      return await listAgents(businessId);
    }
    const routine = role?.routines[0];
    await insertRoutine({
      agentId: created.id,
      name: routine?.name ?? "Morning owner brief",
      prompt: routine ? textOf(routine.prompt, ctx) : "Summarize queued specialist work. Do not send anything.",
      scheduleLabel: routine?.scheduleLabel ?? "Every morning",
      intervalMs: routine?.intervalMs ?? 86_400_000,
      enabled: true,
      nextRunAt: Date.now() + (routine?.intervalMs ?? 86_400_000),
    });
    ensureWorkspace(created.id);
    await upsertComputer(created.id, "local", "not_connected", LOCAL_COMPUTER_NOTE);
    await recordAudit({
      businessId: business.id,
      userId: business.userId,
      agentId: created.id,
      actor: "orchestrator",
      kind: "team.backfilled",
      summary: `Added ${created.name} so this existing desk has an owner-facing orchestrator.`,
    });
    agents = await listAgents(businessId);
  }
  const ctx: BlueprintContext = { city: business.city, businessName: business.name };
  if (blueprint) {
    for (const agent of agents) {
      const role = blueprint.roles.find((item) => item.role === agent.role);
      if (!role) continue;
      if (agent.role === "orchestrator" && agent.name === "Quinn") {
        await setAgentName(agent.id, "Bizzie");
        await setAgentInstructions(agent.id, role.instructions(ctx));
      }
      if (!agent.specialty) await setAgentSpecialty(agent.id, role.specialty);
      if (!agent.tools.length) await setAgentTools(agent.id, role.tools);
    }
  }
  return await listAgents(businessId);
}

