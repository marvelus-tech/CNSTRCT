import { businessName, cityOf, type TemplateId } from "../copy";
import { newId } from "../ids";
import {
  getAgent,
  insertAgent,
  insertBusiness,
  insertLead,
  insertRoutine,
  listAgents,
  slugTaken,
  upsertComputer,
} from "../store";
import type { Agent, Business, Profile } from "../types";
import { configuredProvider, ensureWorkspace, providerNote } from "./sandbox";
import { runRoutine } from "./scheduler";

const DAY = 24 * 60 * 60 * 1000;

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

interface DeskBlueprint {
  scoutName: string;
  scoutTitle: string;
  scoutInstructions: (city: string) => string;
  scoutRoutineName: string;
  scoutRoutinePrompt: (city: string) => string;
  scoutRoutineLabel: string;
  matcherName: string;
  matcherTitle: string;
  matcherInstructions: (city: string) => string;
  matcherRoutineName: string;
  matcherRoutinePrompt: string;
  matcherRoutineLabel: string;
  exampleLead: (city: string) => { name: string; phone: string; address: string; service: string };
}

const BLUEPRINTS: Record<string, DeskBlueprint> = {
  "home-services": {
    scoutName: "Mara",
    scoutTitle: "Tradie scout",
    scoutInstructions: (city) =>
      `Find tradies who work in ${city}. Save notes on your computer. Draft one partnership email and wait for approval before any send. Never spend money.`,
    scoutRoutineName: "Weekday tradie sweep",
    scoutRoutinePrompt: (city) =>
      `Search tradies in ${city}, save notes/tradies.md, and draft one partnership email. Do not send it.`,
    scoutRoutineLabel: "Weekdays at 8:00",
    matcherName: "Jules",
    matcherTitle: "Lead matcher",
    matcherInstructions: (city) =>
      `Read homeowner leads for ${city}. Save a short match note. Draft one introduction to a tradie and wait for approval. Example leads are not real customers.`,
    matcherRoutineName: "New lead check",
    matcherRoutinePrompt: "Read the newest homeowner lead, save a match note, and draft an introduction. Do not send it.",
    matcherRoutineLabel: "Every morning",
    exampleLead: (city) => ({
      name: "Alex Rivera",
      phone: "555-0100",
      address: `12 Pine Street, ${city}`,
      service: "Kitchen faucet leak",
    }),
  },
  "mobile-detailing": {
    scoutName: "Riley",
    scoutTitle: "Partnership drafts",
    scoutInstructions: (city) =>
      `Find mobile detailers who serve ${city}. Save notes on your computer. Draft one shop partnership email and wait for approval before any send. Never spend money.`,
    scoutRoutineName: "Weekday detailer sweep",
    scoutRoutinePrompt: (city) =>
      `Search detailers in ${city}, save notes/detailers.md, and draft one partnership email. Do not send it.`,
    scoutRoutineLabel: "Weekdays at 8:00",
    matcherName: "Sam",
    matcherTitle: "Job match",
    matcherInstructions: (city) =>
      `Read driveway booking leads for ${city}. Save a short match note. Draft one introduction to a detailer and wait for approval. Example leads are not real customers.`,
    matcherRoutineName: "New booking check",
    matcherRoutinePrompt: "Read the newest driveway booking, save a match note, and draft an introduction. Do not send it.",
    matcherRoutineLabel: "Every morning",
    exampleLead: (city) => ({
      name: "Jordan Lee",
      phone: "555-0142",
      address: `88 Maple Drive, ${city}`,
      service: "Full exterior wash, Saturday 9am",
    }),
  },
};

function blueprintFor(templateId: string): DeskBlueprint {
  return BLUEPRINTS[templateId] ?? BLUEPRINTS["home-services"]!;
}

export async function openDesk(
  userId: string,
  profile: Profile,
  templateId: TemplateId | string = "home-services",
): Promise<{ business: Business; agents: Agent[] }> {
  const city = cityOf(profile.location);
  const name = businessName(profile, templateId as TemplateId);
  const plan = blueprintFor(templateId);
  const business = insertBusiness({
    userId,
    templateId,
    name,
    slug: uniqueSlug(name),
    city,
    profileJson: JSON.stringify(profile),
  });

  const scout = insertAgent({
    businessId: business.id,
    userId,
    role: "scout",
    name: plan.scoutName,
    title: plan.scoutTitle,
    instructions: plan.scoutInstructions(city),
    status: "active",
  });
  const matcher = insertAgent({
    businessId: business.id,
    userId,
    role: "matcher",
    name: plan.matcherName,
    title: plan.matcherTitle,
    instructions: plan.matcherInstructions(city),
    status: "active",
  });

  for (const agent of [scout, matcher]) {
    ensureWorkspace(agent.id);
    const provider = configuredProvider();
    upsertComputer(agent.id, provider, "running", providerNote(provider));
  }

  const scoutRoutine = insertRoutine({
    agentId: scout.id,
    name: plan.scoutRoutineName,
    prompt: plan.scoutRoutinePrompt(city),
    scheduleLabel: plan.scoutRoutineLabel,
    intervalMs: DAY,
    enabled: true,
    nextRunAt: null,
  });
  const matchRoutine = insertRoutine({
    agentId: matcher.id,
    name: plan.matcherRoutineName,
    prompt: plan.matcherRoutinePrompt,
    scheduleLabel: plan.matcherRoutineLabel,
    intervalMs: DAY,
    enabled: true,
    nextRunAt: null,
  });

  const lead = plan.exampleLead(city);
  insertLead({
    businessId: business.id,
    name: lead.name,
    phone: lead.phone,
    address: lead.address,
    service: lead.service,
    source: "example",
  });

  await runRoutine(scoutRoutine.id);
  await runRoutine(matchRoutine.id);

  return {
    business,
    agents: [getAgent(scout.id), getAgent(matcher.id)].filter((agent): agent is Agent => Boolean(agent)),
  };
}