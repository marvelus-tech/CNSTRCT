import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

process.env.CNSTRCT_DATA_DIR = mkdtempSync(path.join(tmpdir(), "cnstrct-treg-"));
delete process.env.DATABASE_URL;
delete process.env.TREG_TOKEN;
delete process.env.TREG_ORG_ID;

const TOKEN = "treg_live_test_token_value";
const ORG = "org_bizos_test";

type FetchCall = { method: string; url: string; headers: Record<string, string>; body: string };

function mockTregFetch(handlers?: { onBudgetPut?: () => { status: number; body: unknown } }) {
  const calls: FetchCall[] = [];
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
    if (method === "PUT" && url.includes("/budgets/customer/")) {
      const custom = handlers?.onBudgetPut?.();
      if (custom) {
        return json(custom.status, custom.body);
      }
      return json(200, { ok: true });
    }
  if (method === "POST" && url.includes("/call/")) {
      return json(200, { output: { ok: true } }, { "X-Treg-Call-Id": "call_1", "X-Treg-Cost-Micro": "1000" });
    }
    return json(404, { error: "not found" });
  }) as typeof fetch;
  return {
    calls,
    restore() {
      globalThis.fetch = original;
    },
  };
}

function json(status: number, body: unknown, extraHeaders?: Record<string, string>) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "ERR",
    headers: new Headers(extraHeaders ?? {}),
    text: async () => JSON.stringify(body),
  } as Response;
}

test("treg worker skips without env and succeeds on budget PUT", async () => {
  const { provisionTregForBusiness } = await import("./provision-treg");
  const { createUser, insertBusinessWithProvisioningJobs, saveProfile, getBusiness } = await import("../store");
  const { composioUserId, tregCustomerTag } = await import("./adapters");
  const bizId = "biz_treg_ok";
  const skip = await provisionTregForBusiness(bizId);
  assert.equal(skip.kind, "skipped");
  const mock = mockTregFetch();
  process.env.TREG_TOKEN = TOKEN;
  process.env.TREG_ORG_ID = ORG;
  try {
    const user = await createUser({ email: "treg@cnstrct.local", name: "Treg" });
    await saveProfile({
      userId: user.id,
      interests: "",
      skills: "",
      hasIdea: false,
      ideaText: "",
      space: "none",
      capital: "none",
      trades: "no",
      location: "Austin",
      constraints: "",
    });
    const tag = tregCustomerTag(bizId);
    await insertBusinessWithProvisioningJobs(
      {
        id: bizId,
        userId: user.id,
        templateId: "home-services",
        name: "Treg Co",
        slug: "treg-co",
        city: "Austin",
        profileJson: null,
        orgoWorkspaceId: null,
        orgoComputerId: null,
        composioUserId: composioUserId(bizId),
        tregCustomerTag: tag,
        provisionStatus: "pending",
        provisionError: null,
        createIdempotencyKey: null,
      },
      [],
    );
    const first = await provisionTregForBusiness(bizId);
    assert.equal(first.kind, "succeeded");
    assert.equal(mock.calls.filter((c) => c.method === "PUT").length, 1);
    assert.equal(mock.calls[0]?.headers["X-Treg-Token"], TOKEN);
    assert.match(mock.calls[0]?.url ?? "", new RegExp(`/budgets/customer/${encodeURIComponent(tag)}`));
    const business = await getBusiness(bizId);
    assert.equal(business?.tregBudgetStatus, "set");
    const second = await provisionTregForBusiness(bizId);
    assert.equal(second.kind, "succeeded");
    assert.equal(mock.calls.filter((c) => c.method === "PUT").length, 1);
    const serialized = JSON.stringify({ business });
    assert.equal(serialized.includes(TOKEN), false);
  } finally {
    mock.restore();
    delete process.env.TREG_TOKEN;
    delete process.env.TREG_ORG_ID;
  }
});

test("treg 429 schedules retry and records failed budget status", async () => {
  const { provisionTregForBusiness } = await import("./provision-treg");
  const { createUser, insertBusinessWithProvisioningJobs, saveProfile, getBusiness } = await import("../store");
  const { composioUserId, tregCustomerTag } = await import("./adapters");
  const bizId = "biz_treg_429";
  const mock = mockTregFetch({ onBudgetPut: () => ({ status: 429, body: { error: "slow", code: "org_rate_limit" } }) });
  process.env.TREG_TOKEN = TOKEN;
  process.env.TREG_ORG_ID = ORG;
  try {
    const user = await createUser({ email: "treg429@cnstrct.local", name: "Treg429" });
    await saveProfile({
      userId: user.id,
      interests: "",
      skills: "",
      hasIdea: false,
      ideaText: "",
      space: "none",
      capital: "none",
      trades: "no",
      location: "Austin",
      constraints: "",
    });
    await insertBusinessWithProvisioningJobs(
      {
        id: bizId,
        userId: user.id,
        templateId: "home-services",
        name: "Treg429",
        slug: "treg429",
        city: "Austin",
        profileJson: null,
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
    const outcome = await provisionTregForBusiness(bizId);
    assert.equal(outcome.kind, "retry");
    const business = await getBusiness(bizId);
    assert.equal(business?.tregBudgetStatus, "failed");
  } finally {
    mock.restore();
    delete process.env.TREG_TOKEN;
    delete process.env.TREG_ORG_ID;
  }
});

test("prospect call sets meta and route max cost", async () => {
  const { runProspectCall } = await import("./treg-prospect");
  const { createUser, insertBusinessWithProvisioningJobs, saveProfile } = await import("../store");
  const { composioUserId, tregCustomerTag } = await import("./adapters");
  const bizId = "biz_treg_call";
  const mock = mockTregFetch();
  process.env.TREG_TOKEN = TOKEN;
  process.env.TREG_ORG_ID = ORG;
  try {
    const user = await createUser({ email: "prospect@cnstrct.local", name: "Prospect" });
    await saveProfile({
      userId: user.id,
      interests: "",
      skills: "",
      hasIdea: false,
      ideaText: "",
      space: "none",
      capital: "none",
      trades: "no",
      location: "Austin",
      constraints: "",
    });
    await insertBusinessWithProvisioningJobs(
      {
        id: bizId,
        userId: user.id,
        templateId: "home-services",
        name: "Prospect",
        slug: "prospect",
        city: "Austin",
        profileJson: null,
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
    const result = await runProspectCall({
      businessId: bizId,
      userId: user.id,
      feature: "email-verify",
      body: { email: "owner@example.com" },
      idempotencyKey: "idem-verify-1",
    });
    assert.equal(result.ok, true);
    const call = mock.calls.find((c) => c.method === "POST");
    assert.ok(call);
    assert.match(call.url, /treg\.people\.email\.verify/);
    assert.equal(call.headers["X-Treg-Token"], TOKEN);
    assert.match(call.headers["X-Treg-Meta"] ?? "", /customer=biz_biz_treg_call/);
    assert.match(call.headers["X-Treg-Meta"] ?? "", /feature=email-verify/);
    assert.ok(call.headers["X-Treg-Route-Max-Cost"]);
    assert.equal(call.headers["Idempotency-Key"], "idem-verify-1");
    assert.equal(call.headers.Authorization, undefined);
  } finally {
    mock.restore();
    delete process.env.TREG_TOKEN;
    delete process.env.TREG_ORG_ID;
  }
});