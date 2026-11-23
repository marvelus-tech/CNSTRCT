import type { BusinessBlueprint, RoleBlueprint } from "./blueprint";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { mapSeq } from "../seq";


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
  const user = await createUser({ email: "draft@cnstrct.local", name: "Draft" });
  const local = { ...profile, userId: user.id };
  await saveProfile(local);
  const desk = await openDesk(user.id, local);
  const quinn = desk.agents.find((agent) => agent.role === "orchestrator")!;
  const mara = desk.agents.find((agent) => agent.role === "scout")!;
  await enqueue(quinn.id, { type: "user", text: "Find tradies and draft outreach" });
  const card = (await listRows(mara.id)).find((row) => row.kind === "card" && row.body.status === "pending");
  await assert.rejects(
    async () => await resolveApproval(user.id, String(card?.body.approvalId), "allow", { command: "echo pwned" }, mara.id),
    /edited draft/,
  );
  assert.equal((await getApproval(String(card?.body.approvalId)))?.status, "pending");
  assert.equal(readTerminal(mara.id).includes("pwned"), false);
  await assert.rejects(async () => await resolveApproval(user.id, String(card?.body.approvalId), "ship-it", undefined, mara.id), /not allowed/);
});

test("a new message to Bizzie expires the specialist approval before it can run", async () => {
  const { createUser, getApproval, listTasks, saveProfile } = await import("../store");
  const { openDesk } = await import("./provision");
  const { enqueue, resolveApproval } = await import("./loop");
  const { listRows } = await import("../store");
  const { readTerminal } = await import("./sandbox");
  const user = await createUser({ email: "expire@cnstrct.local", name: "Expire" });
  const local = { ...profile, userId: user.id };
  await saveProfile(local);
  const desk = await openDesk(user.id, local);
  const quinn = desk.agents.find((agent) => agent.role === "orchestrator")!;
  const mara = desk.agents.find((agent) => agent.role === "scout")!;
  await enqueue(quinn.id, { type: "user", text: "Find tradies and draft outreach" });
  const card = (await listRows(mara.id)).find((row) => row.kind === "card" && row.body.status === "pending");
  const approvalId = String(card?.body.approvalId);
  await enqueue(quinn.id, { type: "user", text: "Stop that request" });
  assert.equal((await getApproval(approvalId))?.status, "expired");
  assert.equal((await listTasks(desk.business.id))[0]?.status, "cancelled");
  await resolveApproval(user.id, approvalId, "allow", undefined, mara.id);
  assert.equal((await getApproval(approvalId))?.status, "expired");
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
  const user = await createUser({ email: "orgo@cnstrct.local", name: "Orgo" });
  const local = { ...profile, userId: user.id };
  await saveProfile(local);
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
  try {
    const desk = await openDesk(user.id, local);
    const quinn = desk.agents.find((agent) => agent.role === "orchestrator")!;
    const mara = desk.agents.find((agent) => agent.role === "scout")!;
    const jules = desk.agents.find((agent) => agent.role === "matcher")!;
    assert.equal(quinn.orgoComputerId, null);
    assert.equal(mara.orgoComputerId, null);
    assert.equal(jules.orgoComputerId, null);
    assert.equal(computers, 0);
    assert.equal(calls.some((call) => call.url.endsWith("/workspaces")), false);
    const { getProvisioningJobsForBusiness, setBusinessOrgoIds, upsertComputer } = await import("../store");
    const { ORGO_COMPUTER_NOTE } = await import("./provision");
    const jobs = await getProvisioningJobsForBusiness(desk.business.id);
    assert.equal(jobs.length, 3);
    await setBusinessOrgoIds(desk.business.id, { orgoWorkspaceId: "ws_test", orgoComputerId: "comp_1" });
    await upsertComputer(mara.id, "orgo", "connected", ORGO_COMPUTER_NOTE);
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
    assert.equal((await getComputer(mara.id))?.provider, "orgo");
  } finally {
    globalThis.fetch = original;
    delete process.env.ORGO_API_KEY;
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
  const user = await createUser({ email: "scope@cnstrct.local", name: "Scope" });
  const local = { ...profile, userId: user.id };
  await saveProfile(local);
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
  await setActionPolicy(first.business.id, firstScout.id, "shell", "always_allow");
  assert.equal((await policyFor(user.id, "shell", { businessId: first.business.id, agentId: firstScout.id })).decision, "allow");
  assert.equal((await policyFor(user.id, "shell", { businessId: second.business.id, agentId: secondScout.id })).decision, "ask");
  assert.equal((await policyFor(user.id, "send_outreach", { businessId: first.business.id, agentId: firstScout.id })).decision, "ask");

  await assert.rejects(async () =>
    await insertAgent({
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
  const removed = await deleteBusinessForUser(user.id, first.business.id);
  assert.ok(removed);
  assert.equal(await getBusiness(first.business.id), null);
  assert.ok(await getBusiness(second.business.id));
  assert.ok(await getProfile(user.id));
});

test("find -exec stays rejected, including when shell is always allowed", async () => {
  const { planCommand, execInSandbox } = await import("./sandbox");
  const { createUser, saveProfile, setActionPolicy } = await import("../store");
  const { openDesk } = await import("./provision");
  const { policyFor } = await import("./policy");
  const { runTool } = await import("./tools");
  const user = await createUser({ email: "exec@cnstrct.local", name: "Exec" });
  const local = { ...profile, userId: user.id };
  await saveProfile(local);
  const { business, agents } = await openDesk(user.id, local);
  const scout = agents.find((agent) => agent.role === "scout");
  assert.ok(scout);
  for (const command of [
    "find . -exec /usr/bin/id {} +",
    "find . -execdir /bin/id {} +",
    "find . -ok id {} +",
    "find . -delete",
    "find . -fprint /tmp/out",
    "ls -exec id",
    "cp notes/a /tmp/b",
    "rm -rf ../secret",
  ]) {
    const plan = planCommand(command);
    assert.equal(plan.ok, false, command);
    const ran = await execInSandbox(scout.id, command);
    assert.equal(ran.exitCode, 126, command);
    assert.equal(ran.output.includes("uid="), false);
  }
  assert.equal(planCommand("echo hi").ok, true);
  assert.equal(planCommand("ls -la notes").ok, true);

  await setActionPolicy(business.id, scout.id, "shell", "always_allow");
  assert.equal((await policyFor(user.id, "shell", { businessId: business.id, agentId: scout.id })).decision, "allow");
  const ctx = { agent: scout, business, city: "Austin" };
  const first = await runTool("shell", { command: "find . -exec /usr/bin/id {} +" }, ctx);
  const replay = await runTool("shell", { command: "find . -exec /usr/bin/id {} +" }, ctx);
  assert.equal(first.status, "error");
  assert.equal(replay.status, "error");
  assert.equal(`${first.output}${replay.output}`.includes("uid="), false);
  const safe = await runTool("shell", { command: "echo hi" }, ctx);
  assert.equal(safe.status, "done");
  assert.match(String(safe.output), /hi/);
});

test("start over deletes Orgo computers before local rows, and a failed delete keeps the ids", async () => {
  const previous = globalThis.fetch;
  const key = "sk_test_reset_secret";
  const { createUser, getBusiness, saveProfile } = await import("../store");
  const { openDesk } = await import("./provision");
  const { cleanupOrgoComputers, resetBusiness } = await import("./reset");
  const calls: string[] = [];
  try {
    const user = await createUser({ email: "reset-orgo@cnstrct.local", name: "Reset" });
    const local = { ...profile, userId: user.id };
    await saveProfile(local);
    const { business, agents } = await openDesk(user.id, local);
    const specialists = agents.filter((agent) => agent.role !== "orchestrator");
    assert.equal(specialists.length, 2);
    const { setBusinessOrgoIds } = await import("../store");
    await setBusinessOrgoIds(business.id, { orgoWorkspaceId: "ws_reset", orgoComputerId: "comp_reset_0" });
    const keptUser = await createUser({ email: "reset-fail@cnstrct.local", name: "Keep" });
    const keptProfile = { ...profile, userId: keptUser.id };
    await saveProfile(keptProfile);
    const kept = await openDesk(keptUser.id, keptProfile);
    await setBusinessOrgoIds(kept.business.id, { orgoWorkspaceId: "ws_keep", orgoComputerId: "comp_keep_1" });

    const blocked = await resetBusiness(user.id, business.id);
    assert.equal(blocked.ok, false);
    if (!blocked.ok) {
      assert.match(blocked.error, /no API key/i);
      assert.equal(blocked.error.includes(key), false);
      assert.deepEqual(blocked.computerIds, ["comp_reset_0"]);
    }
    assert.ok(await getBusiness(business.id));

    process.env.ORGO_API_KEY = key;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method || "GET";
      calls.push(`${method} ${url}`);
      const headers = init?.headers as Record<string, string> | undefined;
      assert.equal(headers?.Authorization, `Bearer ${key}`);
      if (url.endsWith("/workspaces") && method === "GET") {
        return {
          ok: true,
          status: 200,
          statusText: "OK",
          text: async () => JSON.stringify({ workspaces: [{ id: "ws_reset", name: "cnstrct-x", desktops: [] }] }),
        } as Response;
      }
      if (url.includes("/workspaces/") && method === "DELETE") {
        return { ok: true, status: 200, statusText: "OK", text: async () => JSON.stringify({ success: true }) } as Response;
      }
      const status = url.endsWith("/comp_reset_1") ? 404 : 200;
      const body = status === 404 ? { error: "Computer not found" } : { success: true };
      return { ok: status === 200, status, statusText: status === 200 ? "OK" : "Not Found", text: async () => JSON.stringify(body) } as Response;
    }) as typeof fetch;
    const cleared = await resetBusiness(user.id, business.id);
    assert.equal(cleared.ok, true);
    assert.equal(await getBusiness(business.id), null);
    assert.ok(calls[0]?.includes("DELETE") && calls[0]?.includes("comp_reset_0"));
    assert.ok(calls.some((call) => call.includes("/workspaces") && call.startsWith("GET")));
    assert.equal(JSON.stringify(cleared).includes(key), false);

    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/comp_keep_1")) {
        return { ok: false, status: 500, statusText: "ERR", text: async () => JSON.stringify({ error: `nope ${key}` }) } as Response;
      }
      return { ok: true, status: 200, statusText: "OK", text: async () => JSON.stringify({ success: true }) } as Response;
    }) as typeof fetch;
    const failed = await resetBusiness(keptUser.id, kept.business.id);
    assert.equal(failed.ok, false);
    if (!failed.ok) {
      assert.equal(failed.error.includes(key), false);
      assert.match(failed.error, /kept so you can retry/i);
      assert.deepEqual(failed.computerIds, ["comp_keep_1"]);
    }
    assert.ok(await getBusiness(kept.business.id));
    assert.ok(await getBusiness(kept.business.id));

    const unsafe = await cleanupOrgoComputers(["comp/../secret"]);
    assert.equal(unsafe.ok, false);
    if (!unsafe.ok) {
      assert.deepEqual(unsafe.remaining, ["comp/../secret"]);
      assert.equal(unsafe.error.includes(key), false);
    }
  } finally {
    globalThis.fetch = previous;
    delete process.env.ORGO_API_KEY;
  }
});
