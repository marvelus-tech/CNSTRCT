import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

process.env.CNSTRCT_DATA_DIR = mkdtempSync(path.join(tmpdir(), "cnstrct-team-"));
delete process.env.ORGO_API_KEY;
delete process.env.ORGO_WORKSPACE_ID;
delete process.env.COMPOSIO_API_KEY;
delete process.env.XAI_API_KEY;
delete process.env.OPENAI_API_KEY;

const profile = {
  userId: "",
  interests: "woodworking",
  skills: "talking to neighbors",
  hasIdea: false,
  ideaText: "",
  space: "corner" as const,
  capital: "none" as const,
  trades: "maybe" as const,
  location: "Austin, TX",
  constraints: "",
};

test("blueprint rejects a desk that is not one orchestrator and two specialists", async () => {
  const { BLUEPRINTS, validateBlueprint } = await import("./blueprint");
  const live = BLUEPRINTS["home-services"]!;
  assert.equal(validateBlueprint(live).ok, true);
  const broken = { ...live, roles: live.roles.filter((role) => role.role !== "orchestrator") };
  assert.equal(validateBlueprint(broken).ok, false);
  const armed = {
    ...live,
    roles: live.roles.map((role) => (role.role === "orchestrator" ? { ...role, tools: ["shell"] } : role)),
  };
  assert.equal(validateBlueprint(armed).ok, false);
});

test("a new blueprint provisions three roles without a code branch", async () => {
  const { validateBlueprint } = await import("./blueprint");
  type BusinessBlueprint = import("./blueprint").BusinessBlueprint;
  type RoleBlueprint = import("./blueprint").RoleBlueprint;
  const { provisionBlueprint } = await import("./provision");
  const { createUser, saveProfile, listRoutines } = await import("../store");
  const day = 86_400_000;
  const role = (name: string, kind: RoleBlueprint["role"], tools: string[]): RoleBlueprint => ({
    role: kind,
    name,
    title: name,
    specialty: `${name} specialty`,
    instructions: () => `${name} instructions`,
    tools,
    routines: [{ name: `${name} routine`, scheduleLabel: "Every morning", intervalMs: day, prompt: () => "planned" }],
  });
  const blueprint: BusinessBlueprint = {
    templateId: "fixture-desk",
    roles: [
      role("Ada", "orchestrator", ["delegate", "list_leads"]),
      role("Bea", "scout", ["shell", "send_outreach"]),
      role("Cal", "matcher", ["list_leads", "send_match"]),
    ],
    exampleLead: () => ({ name: "Example", phone: "555", address: "1 St", service: "test" }),
  };
  assert.equal(validateBlueprint(blueprint).ok, true);
  const user = createUser({ email: "fixture@cnstrct.local", name: "Fixture" });
  const local = { ...profile, userId: user.id };
  saveProfile(local);
  const desk = await provisionBlueprint(user.id, local, blueprint, "Fixture Desk");
  assert.equal(desk.business.templateId, "fixture-desk");
  assert.deepEqual(
    desk.agents.map((agent) => agent.role),
    ["orchestrator", "scout", "matcher"],
  );
  assert.equal(listRoutines(desk.agents[1]!.id)[0]?.lastRunAt ?? null, null);
  assert.deepEqual(
    desk.agents.find((agent) => agent.name === "Bea")?.tools,
    ["shell", "send_outreach"],
  );
});

test("owner delegates through Quinn and shell waits for approval", async () => {
  const { createUser, listAudit, listRows, listTasks, saveProfile } = await import("../store");
  const { openDesk } = await import("./provision");
  const { enqueue, ownerCanMessage, resolveApproval } = await import("./loop");
  const { policyFor } = await import("./policy");
  const fs = await import("node:fs");
  const { sandboxRoot } = await import("./sandbox");

  const user = createUser({ email: "team@cnstrct.local", name: "Owner" });
  const local = { ...profile, userId: user.id };
  saveProfile(local);
  const desk = await openDesk(user.id, local);
  const quinn = desk.agents.find((agent) => agent.role === "orchestrator")!;
  const mara = desk.agents.find((agent) => agent.role === "scout")!;
  assert.equal(ownerCanMessage(quinn), true);
  assert.equal(ownerCanMessage(mara), false);
  assert.equal(policyFor(user.id, "delegate").decision, "allow");
  assert.equal(policyFor(user.id, "shell").decision, "ask");
  assert.equal(policyFor(user.id, "send_outreach").decision, "ask");

  await enqueue(quinn.id, { type: "user", text: "Find tradies and draft outreach" });
  const tasks = listTasks(desk.business.id);
  assert.equal(tasks.length, 1);
  assert.equal(tasks[0]?.toAgentId, mara.id);
  const card = listRows(mara.id).find((row) => row.kind === "card" && row.body.status === "pending");
  assert.equal(card?.body.tool, "shell");
  assert.equal(fs.existsSync(path.join(sandboxRoot(mara.id), "outbox", "outreach.json")), false);
  assert.ok(listAudit(desk.business.id).some((event) => event.kind === "task.delegated"));
  assert.ok(listAudit(desk.business.id).some((event) => event.kind === "approval.requested"));

  await resolveApproval(user.id, String(card?.body.approvalId), "deny");
  const denied = listRows(mara.id).find((row) => row.id === card?.id);
  assert.equal(denied?.body.status, "denied");
  assert.equal(fs.existsSync(path.join(sandboxRoot(mara.id), "outbox", "outreach.json")), false);
});

test("edited shell approval runs the edited command", async () => {
  const { createUser, saveProfile } = await import("../store");
  const { openDesk } = await import("./provision");
  const { enqueue, resolveApproval } = await import("./loop");
  const { listRows } = await import("../store");
  const { readTerminal } = await import("./sandbox");

  const user = createUser({ email: "edit@cnstrct.local", name: "Editor" });
  const local = { ...profile, userId: user.id };
  saveProfile(local);
  const desk = await openDesk(user.id, local, "mobile-detailing");
  const quinn = desk.agents.find((agent) => agent.name === "Quinn")!;
  const riley = desk.agents.find((agent) => agent.name === "Riley")!;
  await enqueue(quinn.id, { type: "user", text: "Find detailers and draft outreach" });
  const card = listRows(riley.id).find((row) => row.kind === "card" && row.body.status === "pending");
  assert.equal(card?.body.tool, "shell");
  await resolveApproval(user.id, String(card?.body.approvalId), "edit", { command: "echo edited-ok" });
  assert.match(readTerminal(riley.id), /edited-ok/);
});

test("existing two-agent desk gains an orchestrator without dropping specialists", async () => {
  const { createUser, insertAgent, insertBusiness, listAgents, saveProfile } = await import("../store");
  const { ensureTeamShape } = await import("./provision");
  const user = createUser({ email: "legacy@cnstrct.local", name: "Legacy" });
  saveProfile({ ...profile, userId: user.id });
  const business = insertBusiness({
    userId: user.id,
    templateId: "home-services",
    name: "Legacy Home Match",
    slug: "legacy-home-match",
    city: "Austin",
    profileJson: JSON.stringify(profile),
  });
  insertAgent({
    businessId: business.id,
    userId: user.id,
    role: "scout",
    name: "Mara",
    title: "Tradie scout",
    specialty: "",
    instructions: "legacy",
    status: "active",
  });
  insertAgent({
    businessId: business.id,
    userId: user.id,
    role: "matcher",
    name: "Jules",
    title: "Lead matcher",
    specialty: "",
    instructions: "legacy",
    status: "active",
  });
  const team = ensureTeamShape(business.id);
  assert.equal(team.filter((agent) => agent.role === "orchestrator").length, 1);
  assert.deepEqual(team.filter((agent) => agent.role !== "orchestrator").map((agent) => agent.name).sort(), ["Jules", "Mara"]);
  assert.ok((listAgents(business.id).find((agent) => agent.name === "Mara")?.specialty.length ?? 0) > 0);
});

test("adapters stay not configured and never report a send or a VM", async () => {
  const { composioTenantId, computerState, connectionState, ORGO_SMALL, sessionForRole, deliverComposioSend } = await import("./adapters");
  assert.equal(composioTenantId("biz_123"), "biz_biz_123");
  assert.equal(connectionState({ keySet: false, connectedAccountId: null }), "not_configured");
  assert.equal(connectionState({ keySet: true, connectedAccountId: null }), "not_connected");
  assert.equal(computerState(null, false), "not_configured");
  assert.equal(computerState("comp_1", true), "connected");
  assert.equal(ORGO_SMALL.cpu, 0.5);
  assert.equal(ORGO_SMALL.ram, 4);
  const scout = sessionForRole({ businessId: "biz_123", role: "scout" });
  assert.equal(scout.sessionPreset, "direct_tools");
  assert.equal(scout.manageConnections.enable, false);
  assert.equal(scout.sandbox.enable, false);
  const gmailTools = scout.tools?.gmail.enable ?? [];
  assert.deepEqual(gmailTools, []);
  assert.equal(gmailTools.some((tool) => tool === "GMAIL_SEND_EMAIL"), false);
  const quinn = sessionForRole({ businessId: "biz_123", role: "orchestrator" });
  assert.deepEqual(quinn.toolkits?.enable, []);
  const delivery = await deliverComposioSend({
    businessId: "biz_123",
    role: "scout",
    connectedAccountId: null,
    args: { to: "a@b.example" },
  });
  assert.equal(delivery.delivered, false);
  if (!delivery.delivered) assert.equal(delivery.reason, "not_configured");
  process.env.COMPOSIO_API_KEY = "present";
  const keyed = await deliverComposioSend({
    businessId: "biz_123",
    role: "scout",
    connectedAccountId: "ca_1",
    args: { to: "a@b.example", subject: "Hi", body: "Hello" },
  });
  delete process.env.COMPOSIO_API_KEY;
  assert.equal(keyed.delivered, false);
  if (!keyed.delivered) assert.equal(keyed.reason, "not_configured");
});
