import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

process.env.CNSTRCT_DATA_DIR = mkdtempSync(path.join(tmpdir(), "cnstrct-orgo-ext-"));
delete process.env.DATABASE_URL;

const profile = {
  userId: "",
  interests: "woodworking",
  skills: "talking",
  hasIdea: false,
  ideaText: "",
  space: "corner" as const,
  capital: "none" as const,
  trades: "maybe" as const,
  location: "Austin, TX",
  constraints: "",
};

const API_KEY = "sk_live_test_provision_external";

type FetchCall = { method: string; url: string; headers: Record<string, string>; body: string };

function mockOrgoFetch(handlers: {
  workspaces?: Array<{ id: string; name: string; desktops?: Array<{ id: string; name: string; status?: string }> }>;
  onCreateWorkspace?: (name: string) => { status: number; body: unknown };
  onCreateComputer?: (body: { workspace_id: string; name: string }) => { status: number; body: unknown };
  rateLimitOnce?: boolean;
}) {
  const calls: FetchCall[] = [];
  let workspaceList = [...(handlers.workspaces ?? [])];
  let rateLimited = Boolean(handlers.rateLimitOnce);
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    const headers = Object.fromEntries(
      init?.headers instanceof Headers
        ? init.headers.entries()
        : Object.entries((init?.headers as Record<string, string>) ?? {}),
    );
    const body = typeof init?.body === "string" ? init.body : "";
    calls.push({ method, url, headers, body });
    if (url.endsWith("/workspaces") && method === "GET") {
      return json(200, { workspaces: workspaceList });
    }
    if (url.endsWith("/workspaces") && method === "POST") {
      const name = (JSON.parse(body) as { name: string }).name;
      const custom = handlers.onCreateWorkspace?.(name);
      if (custom) return json(custom.status, custom.body);
      const id = `ws_${name}`;
      workspaceList = [...workspaceList, { id, name, desktops: [] }];
      return json(201, { id, name, status: "active" });
    }
    if (url.endsWith("/computers") && method === "POST") {
      if (rateLimited) {
        rateLimited = false;
        return json(429, { error: "slow down", code: "rate_limited", retry_after: 5 });
      }
      const parsed = JSON.parse(body) as { workspace_id: string; name: string; cpu?: number; ram?: number };
      const custom = handlers.onCreateComputer?.(parsed);
      if (custom) return json(custom.status, custom.body);
      const computerId = `comp_${parsed.name}_${workspaceList.length}`;
      workspaceList = workspaceList.map((ws) =>
        ws.id === parsed.workspace_id
          ? { ...ws, desktops: [...(ws.desktops ?? []), { id: computerId, name: parsed.name, status: "running" }] }
          : ws,
      );
      assert.equal(parsed.cpu, 2);
      assert.equal(parsed.ram, 8);
      return json(201, { id: computerId, status: "running", name: parsed.name });
    }
    if (method === "GET" && url.includes("/computers/")) {
      return json(200, { id: "comp_existing", status: "running" });
    }
    return json(404, { error: "not found" });
  }) as typeof fetch;
  return {
    calls,
    restore() {
      globalThis.fetch = original;
    },
    get workspaces() {
      return workspaceList;
    },
  };
}

function json(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "ERR",
    text: async () => JSON.stringify(body),
  } as Response;
}

test("orgo worker provisions workspace and desk, persists business ids", async () => {
  const { createUser, getBusiness, saveProfile } = await import("../store");
  const { openDesk } = await import("./provision");
  const { runProvisioningWorkerPass } = await import("./provisioning");
  const mock = mockOrgoFetch({});
  process.env.ORGO_API_KEY = API_KEY;
  try {
    const user = await createUser({ email: "orgo-ext@cnstrct.local", name: "Orgo" });
    const local = { ...profile, userId: user.id };
    await saveProfile(local);
    const desk = await openDesk(user.id, local);
    const result = await runProvisioningWorkerPass();
    assert.ok(result.claimed >= 1);
    const business = await getBusiness(desk.business.id);
    assert.ok(business?.orgoWorkspaceId);
    assert.ok(business?.orgoComputerId);
    assert.match(business.orgoWorkspaceId ?? "", /^ws_cnstrct-/);
    const orgoJobSucceeded = mock.calls.some((call) => call.url.endsWith("/computers") && call.method === "POST");
    assert.equal(orgoJobSucceeded, true);
    const serialized = JSON.stringify({ business });
    assert.equal(serialized.includes(API_KEY), false);
    assert.equal(mock.calls.some((call) => call.headers.Authorization === `Bearer ${API_KEY}`), true);
  } finally {
    mock.restore();
    delete process.env.ORGO_API_KEY;
  }
});

test("NAME_TAKEN on computer create adopts existing desk from workspace inventory", async () => {
  const { provisionOrgoForBusiness } = await import("./provision-orgo");
  const { createUser, insertBusinessWithProvisioningJobs, saveProfile, setBusinessOrgoIds } = await import("../store");
  const { composioUserId, tregCustomerTag } = await import("./adapters");
  const bizId = "biz_orgo_adopt";
  const wsId = "ws_adopt";
  const mock = mockOrgoFetch({
    workspaces: [{ id: wsId, name: `cnstrct-${bizId}`, desktops: [{ id: "comp_desk_existing", name: "desk", status: "running" }] }],
    onCreateComputer: () => ({ status: 409, body: { error: "taken", code: "NAME_TAKEN" } }),
  });
  process.env.ORGO_API_KEY = API_KEY;
  try {
    const user = await createUser({ email: "adopt@cnstrct.local", name: "Adopt" });
    await saveProfile({ ...profile, userId: user.id });
    await insertBusinessWithProvisioningJobs(
      {
        id: bizId,
        userId: user.id,
        templateId: "home-services",
        name: "Adopt Desk",
        slug: "adopt-desk",
        city: "Austin",
        profileJson: JSON.stringify(profile),
        orgoWorkspaceId: wsId,
        orgoComputerId: null,
        composioUserId: composioUserId(bizId),
        tregCustomerTag: tregCustomerTag(bizId),
        provisionStatus: "pending",
        provisionError: null,
        createIdempotencyKey: null,
      },
      [],
    );
    const outcome = await provisionOrgoForBusiness(bizId);
    assert.equal(outcome.kind, "succeeded");
    if (outcome.kind === "succeeded") assert.equal(outcome.computerId, "comp_desk_existing");
    const refreshed = await (await import("../store")).getBusiness(bizId);
    assert.equal(refreshed?.orgoComputerId, "comp_desk_existing");
    await setBusinessOrgoIds(bizId, { orgoComputerId: null });
  } finally {
    mock.restore();
    delete process.env.ORGO_API_KEY;
  }
});

test("429 from Orgo schedules retry without leaking the api key", async () => {
  const { provisionOrgoForBusiness } = await import("./provision-orgo");
  const { createUser, insertBusinessWithProvisioningJobs, saveProfile } = await import("../store");
  const { composioUserId, tregCustomerTag } = await import("./adapters");
  const bizId = "biz_orgo_retry";
  const mock = mockOrgoFetch({ rateLimitOnce: true, workspaces: [] });
  process.env.ORGO_API_KEY = API_KEY;
  try {
    const user = await createUser({ email: "retry@cnstrct.local", name: "Retry" });
    await saveProfile({ ...profile, userId: user.id });
    await insertBusinessWithProvisioningJobs(
      {
        id: bizId,
        userId: user.id,
        templateId: "home-services",
        name: "Retry Desk",
        slug: "retry-desk",
        city: "Austin",
        profileJson: JSON.stringify(profile),
        orgoWorkspaceId: null,
        orgoComputerId: null,
        composioUserId: composioUserId(bizId),
        tregCustomerTag: tregCustomerTag(bizId),
        provisionStatus: "pending",
        provisionError: null,
        createIdempotencyKey: null,
      },
      [],
    );
    const outcome = await provisionOrgoForBusiness(bizId);
    assert.equal(outcome.kind, "retry");
    if (outcome.kind === "retry") {
      assert.equal(outcome.reason.includes(API_KEY), false);
      assert.match(outcome.reason, /rate_limited|Orgo/i);
    }
  } finally {
    mock.restore();
    delete process.env.ORGO_API_KEY;
  }
});

test("sandbox shells use the business desk computer id", async () => {
  const { createUser, saveProfile, setBusinessOrgoIds, upsertComputer } = await import("../store");
  const { openDesk } = await import("./provision");
  const { execInSandbox } = await import("./sandbox");
  const { ORGO_COMPUTER_NOTE } = await import("./provision");
  const calls: string[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    calls.push(`${method} ${new URL(url).pathname}`);
    if (url.includes("/bash")) return json(500, { error: "bash failed" });
    return json(200, { id: "comp_biz_desk", status: "running" });
  }) as typeof fetch;
  process.env.ORGO_API_KEY = API_KEY;
  try {
    const user = await createUser({ email: "sandbox-biz@cnstrct.local", name: "Sandbox" });
    const local = { ...profile, userId: user.id };
    await saveProfile(local);
    const desk = await openDesk(user.id, local);
    const mara = desk.agents.find((agent) => agent.role === "scout")!;
    await setBusinessOrgoIds(desk.business.id, { orgoWorkspaceId: "ws_x", orgoComputerId: "comp_biz_desk" });
    await upsertComputer(mara.id, "orgo", "connected", ORGO_COMPUTER_NOTE);
    const result = await execInSandbox(mara.id, "echo hi");
    assert.equal(result.provider, "orgo");
    assert.ok(calls.some((call) => call.includes("/computers/comp_biz_desk")));
    assert.equal(calls.some((call) => call.includes(mara.id)), false);
  } finally {
    globalThis.fetch = original;
    delete process.env.ORGO_API_KEY;
  }
});