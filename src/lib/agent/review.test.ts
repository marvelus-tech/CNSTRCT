import type { BusinessBlueprint, RoleBlueprint } from "./blueprint";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

process.env.CNSTRCT_DATA_DIR = mkdtempSync(path.join(tmpdir(), "cnstrct-review-"));
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

test("approval buttons follow the textarea, and a dirty allow does not run", async () => {
  const { approvalChoice } = await import("./approval-choice");
  assert.equal(approvalChoice("echo hi", "echo hi").approveEnabled, true);
  assert.equal(approvalChoice("echo hi", "echo hi").editEnabled, false);
  assert.equal(approvalChoice("echo hi", "echo no").approveEnabled, false);
  assert.equal(approvalChoice("echo hi", "echo no").editEnabled, true);

  const { createUser, getApproval, saveProfile } = await import("../store");
  const { openDesk } = await import("./provision");
  const { enqueue, resolveApproval } = await import("./loop");
  const { listRows } = await import("../store");
  const { readTerminal } = await import("./sandbox");
  const user = createUser({ email: "draft@cnstrct.local", name: "Draft" });
  const local = { ...profile, userId: user.id };
  saveProfile(local);
  const desk = await openDesk(user.id, local);
  const quinn = desk.agents.find((agent) => agent.role === "orchestrator")!;
  const mara = desk.agents.find((agent) => agent.role === "scout")!;
  await enqueue(quinn.id, { type: "user", text: "Find tradies and draft outreach" });
  const card = listRows(mara.id).find((row) => row.kind === "card" && row.body.status === "pending");
  await assert.rejects(
    async () => resolveApproval(user.id, String(card?.body.approvalId), "allow", { command: "echo pwned" }, mara.id),
    /edited draft/,
  );
  assert.equal(getApproval(String(card?.body.approvalId))?.status, "pending");
  assert.equal(readTerminal(mara.id).includes("pwned"), false);
  await assert.rejects(async () => resolveApproval(user.id, String(card?.body.approvalId), "ship-it", undefined, mara.id), /not allowed/);
});

test("a new message to Quinn expires the specialist approval before it can run", async () => {
  const { createUser, getApproval, listTasks, saveProfile } = await import("../store");
  const { openDesk } = await import("./provision");
  const { enqueue, resolveApproval } = await import("./loop");
  const { listRows } = await import("../store");
  const { readTerminal } = await import("./sandbox");
  const user = createUser({ email: "expire@cnstrct.local", name: "Expire" });
  const local = { ...profile, userId: user.id };
  saveProfile(local);
  const desk = await openDesk(user.id, local);
  const quinn = desk.agents.find((agent) => agent.role === "orchestrator")!;
  const mara = desk.agents.find((agent) => agent.role === "scout")!;
  await enqueue(quinn.id, { type: "user", text: "Find tradies and draft outreach" });
  const card = listRows(mara.id).find((row) => row.kind === "card" && row.body.status === "pending");
  const approvalId = String(card?.body.approvalId);
  await enqueue(quinn.id, { type: "user", text: "Stop that request" });
  assert.equal(getApproval(approvalId)?.status, "expired");
  assert.equal(listTasks(desk.business.id)[0]?.status, "cancelled");
  await resolveApproval(user.id, approvalId, "allow", undefined, mara.id);
  assert.equal(getApproval(approvalId)?.status, "expired");
  assert.equal(readTerminal(mara.id).includes("cnstrct-search"), false);
});

test("commands reject chaining and interpreters, and a failed Orgo bash stays on Orgo", async () => {
  const { planCommand } = await import("./sandbox");
  assert.equal(planCommand("cd /root").ok, false);
  assert.equal(planCommand("echo hi && id").ok, false);
  assert.equal(planCommand("echo hi\nwhoami").ok, false);
  assert.equal(planCommand("python3 -c 'print(1)'").ok, false);
  assert.equal(planCommand("bash -c id").ok, false);
  const allowed = planCommand("echo hi");
  assert.equal(allowed.ok, true);
  if (allowed.ok) assert.deepEqual(allowed.argv, ["echo", "hi"]);

  const { createUser, getComputer, saveProfile } = await import("../store");
  const { openDesk } = await import("./provision");
  const { execInSandbox } = await import("./sandbox");
  const user = createUser({ email: "orgo@cnstrct.local", name: "Orgo" });
  const local = { ...profile, userId: user.id };
  saveProfile(local);
  const calls: { method: string; url: string; body: string }[] = [];
  let computers = 0;
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    const body = typeof init?.body === "string" ? init.body : "";
    calls.push({ method, url, body });
    const payload = (() => {
      if (url.endsWith("/workspaces")) return { id: "ws_isolated" };
      if (url.endsWith("/computers") && method === "POST") {
        computers += 1;
        return { id: `comp_${computers}`, status: "running" };
      }
      if (url.endsWith("/resume")) return { id: "comp_1", status: "running" };
      if (method === "GET") return { id: "comp_1", status: "suspended" };
      return { error: "bash failed" };
    })();
    const ok = !url.includes("/bash");
    return {
      ok,
      status: ok ? 200 : 500,
      statusText: ok ? "OK" : "Error",
      text: async () => JSON.stringify(payload),
    } as Response;
  }) as typeof fetch;
  process.env.ORGO_API_KEY = "test-key";
  process.env.ORGO_WORKSPACE_ID = "shared-workspace";
  try {
    const desk = await openDesk(user.id, local);
    const quinn = desk.agents.find((agent) => agent.role === "orchestrator")!;
    const mara = desk.agents.find((agent) => agent.role === "scout")!;
    const jules = desk.agents.find((agent) => agent.role === "matcher")!;
    assert.equal(quinn.orgoComputerId, null);
    assert.equal(mara.orgoComputerId, "comp_1");
    assert.equal(jules.orgoComputerId, "comp_2");
    assert.equal(computers, 2);
    const workspace = calls.find((call) => call.url.endsWith("/workspaces"));
    assert.match(workspace?.body ?? "", new RegExp(desk.business.id));
    assert.equal(calls.some((call) => call.body.includes("shared-workspace")), false);
    calls.length = 0;
    const result = await execInSandbox(mara.id, "echo hi");
    assert.equal(result.provider, "orgo");
    assert.notEqual(result.exitCode, 0);
    assert.deepEqual(
      calls.map((call) => `${call.method} ${new URL(call.url).pathname}`),
      ["GET /api/computers/comp_1", "POST /api/computers/comp_1/resume", "POST /api/computers/comp_1/bash"],
    );
    assert.equal(calls.some((call) => call.body.includes("cd /root")), false);
    assert.match(calls.at(-1)?.body ?? "", /echo/);
    assert.equal(getComputer(mara.id)?.provider, "orgo");
  } finally {
    globalThis.fetch = original;
    delete process.env.ORGO_API_KEY;
    delete process.env.ORGO_WORKSPACE_ID;
  }
});

test("blueprint tools are the runtime list, always is per agent, and start over keeps the other desk", async () => {
  const blueprintModule = await import("./blueprint");
  const { validateBlueprint } = blueprintModule;
  const { provisionBlueprint } = await import("./provision");
  const { createUser, deleteBusinessForUser, getBusiness, getProfile, insertAgent, saveProfile, setActionPolicy } = await import("../store");
  const { openDesk } = await import("./provision");
  const { policyFor } = await import("./policy");
  const { runTool, toolSchemasFor } = await import("./tools");
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
    templateId: "fixture-scope",
    roles: [
      role("Ada", "orchestrator", ["delegate", "list_leads"]),
      role("Bea", "scout", ["shell", "send_outreach"]),
      role("Cal", "matcher", ["list_leads", "send_match"]),
    ],
    exampleLead: () => ({ name: "Example", phone: "555", address: "1 St", service: "test" }),
  };
  assert.equal(validateBlueprint(blueprint).ok, true);
  const user = createUser({ email: "scope@cnstrct.local", name: "Scope" });
  const local = { ...profile, userId: user.id };
  saveProfile(local);
  const desk = await provisionBlueprint(user.id, local, blueprint, "Scope Desk");
  const bea = desk.agents.find((agent) => agent.name === "Bea")!;
  assert.deepEqual(
    toolSchemasFor(bea.tools).map((schema) => schema.function.name).sort(),
    ["send_outreach", "shell"],
  );
  const blocked = await runTool("write_file", { path: "notes/x.md", content: "no" }, { agent: bea, business: desk.business, city: "Austin" });
  assert.equal(blocked.status, "error");

  const first = await openDesk(user.id, local);
  const second = await openDesk(user.id, local);
  const firstScout = first.agents.find((agent) => agent.role === "scout")!;
  const secondScout = second.agents.find((agent) => agent.role === "scout")!;
  setActionPolicy(first.business.id, firstScout.id, "shell", "always_allow");
  assert.equal(policyFor(user.id, "shell", { businessId: first.business.id, agentId: firstScout.id }).decision, "allow");
  assert.equal(policyFor(user.id, "shell", { businessId: second.business.id, agentId: secondScout.id }).decision, "ask");
  assert.equal(policyFor(user.id, "send_outreach", { businessId: first.business.id, agentId: firstScout.id }).decision, "ask");

  assert.throws(() =>
    insertAgent({
      businessId: first.business.id,
      userId: user.id,
      role: "orchestrator",
      name: "Extra",
      title: "Extra",
      specialty: "Extra",
      instructions: "Extra",
      status: "active",
      tools: ["delegate"],
    }),
  );
  const removed = deleteBusinessForUser(user.id, first.business.id);
  assert.ok(removed);
  assert.equal(getBusiness(first.business.id), null);
  assert.ok(getBusiness(second.business.id));
  assert.ok(getProfile(user.id));
});
