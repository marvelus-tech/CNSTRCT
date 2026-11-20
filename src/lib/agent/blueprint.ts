import type { AgentRole } from "../types";

/**
 * A business type is data: three roles, their tools, and their routines.
 * openDesk looks up a blueprint. It does not grow a new branch per template.
 */

export interface BlueprintContext {
  city: string;
  businessName: string;
}

export interface RoutineBlueprint {
  name: string;
  scheduleLabel: string;
  intervalMs: number;
  prompt: (ctx: BlueprintContext) => string;
}

export interface RoleBlueprint {
  role: AgentRole;
  name: string;
  title: string;
  specialty: string;
  instructions: (ctx: BlueprintContext) => string;
  tools: string[];
  routines: RoutineBlueprint[];
}

export interface BusinessBlueprint {
  templateId: string;
  roles: RoleBlueprint[];
  exampleLead: (city: string) => { name: string; phone: string; address: string; service: string };
}

const DAY = 24 * 60 * 60 * 1000;

const COMPUTER = ["shell", "write_file", "read_file", "list_files", "screenshot"];

export const ORCHESTRATOR_TOOLS = ["delegate", "list_leads"];
export const SCOUT_TOOLS = [...COMPUTER, "send_outreach"];
export const MATCHER_TOOLS = ["list_leads", ...COMPUTER, "send_match"];

const COMPUTER_OR_SEND = new Set([...COMPUTER, "send_outreach", "send_match", "spend"]);

export function validateBlueprint(blueprint: BusinessBlueprint): { ok: true } | { ok: false; reason: string } {
  if (blueprint.roles.length !== 3) return { ok: false, reason: "A blueprint needs exactly three roles." };
  const orchestrators = blueprint.roles.filter((role) => role.role === "orchestrator");
  if (orchestrators.length !== 1) return { ok: false, reason: "A blueprint needs exactly one orchestrator." };
  const orchestrator = orchestrators[0]!;
  if (orchestrator.tools.some((tool) => COMPUTER_OR_SEND.has(tool))) {
    return { ok: false, reason: "The orchestrator cannot send, spend, or use a computer." };
  }
  for (const role of blueprint.roles) {
    if (!role.name.trim() || !role.specialty.trim()) return { ok: false, reason: `${role.role} needs a name and specialty.` };
    if (!role.tools.length) return { ok: false, reason: `${role.role} needs tools.` };
    if (!role.routines.length) return { ok: false, reason: `${role.role} needs a routine.` };
  }
  const specialists = blueprint.roles.filter((role) => role.role !== "orchestrator");
  if (specialists.length !== 2) return { ok: false, reason: "A blueprint needs two specialists." };
  return { ok: true };
}

function orchestratorRole(scoutName: string, matcherName: string): RoleBlueprint {
  return {
    role: "orchestrator",
    name: "Bizzie",
    title: "Chief of staff",
    specialty: "Routes the owner's requests to the specialists",
    instructions: ({ businessName, city }) =>
      `You are Bizzie, the only agent the owner talks to at ${businessName} in ${city}. Delegate partner research to ${scoutName} and lead matching to ${matcherName}. You cannot send email, spend money, or touch a computer. Bring their drafts back and wait for the owner.`,
    tools: ORCHESTRATOR_TOOLS,
    routines: [
      {
        name: "Morning owner brief",
        scheduleLabel: "Every morning",
        intervalMs: DAY,
        prompt: () =>
          `Ask the scout for a partner draft and the matcher for the newest lead. Do not send anything yourself.`,
      },
    ],
  };
}

export const BLUEPRINTS: Record<string, BusinessBlueprint> = {
  "home-services": {
    templateId: "home-services",
    roles: [
      orchestratorRole("Mara", "Jules"),
      {
        role: "scout",
        name: "Mara",
        title: "Tradie scout",
        specialty: "Finds local tradies and drafts partnership email",
        instructions: (ctx) =>
          `Find tradies who work in ${ctx.city}. Save notes on your computer. Draft one partnership email. The owner approves every command and every send. Never spend money.`,
        tools: SCOUT_TOOLS,
        routines: [
          {
            name: "Weekday tradie sweep",
            scheduleLabel: "Weekdays at 8:00",
            intervalMs: DAY,
            prompt: (ctx) =>
              `Search tradies in ${ctx.city}, save notes/tradies.md, and draft one partnership email. Do not send it.`,
          },
        ],
      },
      {
        role: "matcher",
        name: "Jules",
        title: "Lead matcher",
        specialty: "Reads homeowner leads and drafts introductions",
        instructions: (ctx) =>
          `Read homeowner leads for ${ctx.city}. Save a short match note. Draft one introduction. The owner approves every command and every send. Example leads are not real customers.`,
        tools: MATCHER_TOOLS,
        routines: [
          {
            name: "New lead check",
            scheduleLabel: "Every morning",
            intervalMs: DAY,
            prompt: () => "Read the newest homeowner lead, save a match note, and draft an introduction. Do not send it.",
          },
        ],
      },
    ],
    exampleLead: (city) => ({
      name: "Alex Rivera",
      phone: "555-0100",
      address: `12 Pine Street, ${city}`,
      service: "Kitchen faucet leak",
    }),
  },
  "mobile-detailing": {
    templateId: "mobile-detailing",
    roles: [
      orchestratorRole("Riley", "Sam"),
      {
        role: "scout",
        name: "Riley",
        title: "Partnership drafts",
        specialty: "Finds mobile detailers and drafts shop email",
        instructions: (ctx) =>
          `Find mobile detailers who serve ${ctx.city}. Save notes on your computer. Draft one shop partnership email. The owner approves every command and every send. Never spend money.`,
        tools: SCOUT_TOOLS,
        routines: [
          {
            name: "Weekday detailer sweep",
            scheduleLabel: "Weekdays at 8:00",
            intervalMs: DAY,
            prompt: (ctx) =>
              `Search detailers in ${ctx.city}, save notes/detailers.md, and draft one partnership email. Do not send it.`,
          },
        ],
      },
      {
        role: "matcher",
        name: "Sam",
        title: "Job match",
        specialty: "Reads driveway bookings and drafts introductions",
        instructions: (ctx) =>
          `Read driveway booking leads for ${ctx.city}. Save a short match note. Draft one introduction. The owner approves every command and every send. Example leads are not real customers.`,
        tools: MATCHER_TOOLS,
        routines: [
          {
            name: "New booking check",
            scheduleLabel: "Every morning",
            intervalMs: DAY,
            prompt: () => "Read the newest driveway booking, save a match note, and draft an introduction. Do not send it.",
          },
        ],
      },
    ],
    exampleLead: (city) => ({
      name: "Jordan Lee",
      phone: "555-0142",
      address: `88 Maple Drive, ${city}`,
      service: "Full exterior wash, Saturday 9am",
    }),
  },
  "estate-clearance": {
    templateId: "estate-clearance",
    roles: [
      orchestratorRole("Nora", "Eli"),
      {
        role: "scout",
        name: "Nora",
        title: "Pickup drafts",
        specialty: "Drafts pickup-partner notes for house clearances",
        instructions: (ctx) =>
          `Draft pickup-partner notes for house clearances in ${ctx.city}. The owner approves every command and every send.`,
        tools: SCOUT_TOOLS,
        routines: [
          {
            name: "Pickup partner sweep",
            scheduleLabel: "Weekdays at 8:00",
            intervalMs: DAY,
            prompt: (ctx) => `Search pickup partners in ${ctx.city} and draft one note. Do not send it.`,
          },
        ],
      },
      {
        role: "matcher",
        name: "Eli",
        title: "Listing drafts",
        specialty: "Drafts marketplace listings after the owner approves",
        instructions: (ctx) =>
          `Read clearance leads for ${ctx.city} and draft a listing. Do not post it. The owner approves every command and every send.`,
        tools: MATCHER_TOOLS,
        routines: [
          {
            name: "Listing draft check",
            scheduleLabel: "Every morning",
            intervalMs: DAY,
            prompt: () => "Read the newest clearance lead and draft a listing. Do not post it.",
          },
        ],
      },
    ],
    exampleLead: (city) => ({
      name: "Pat Nguyen",
      phone: "555-0166",
      address: `4 Oak Lane, ${city}`,
      service: "Clear a two-bedroom house",
    }),
  },
};

export function blueprintFor(templateId: string): BusinessBlueprint | null {
  return BLUEPRINTS[templateId] ?? null;
}

export function toolsForRole(role: AgentRole): string[] {
  if (role === "orchestrator") return ORCHESTRATOR_TOOLS;
  if (role === "scout") return SCOUT_TOOLS;
  return MATCHER_TOOLS;
}
