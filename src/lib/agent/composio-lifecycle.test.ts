import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

process.env.CNSTRCT_DATA_DIR = mkdtempSync(path.join(tmpdir(), "cnstrct-composio-"));
delete process.env.COMPOSIO_API_KEY;

test("composio user id uses integration suffix", async () => {
  const { composioUserId, composioTenantId } = await import("./adapters");
  assert.equal(composioUserId("biz_abc"), "biz_biz_abc:integration");
  assert.equal(composioTenantId("biz_abc"), "biz_biz_abc");
});

test("provision composio job writes identity without network", async () => {
  const { createUser, saveProfile, insertBusiness, getBusiness } = await import("../store");
  const { provisionComposioForBusiness } = await import("./provision-composio");
  const { composioUserId } = await import("./adapters");
  const user = await createUser({ email: "composio-ident@cnstrct.local", name: "Composio" });
  await saveProfile({
    userId: user.id,
    interests: "ops",
    skills: "oauth",
    hasIdea: true,
    ideaText: "desk",
    space: "garage",
    capital: "none",
    trades: "no",
    location: "Austin",
    constraints: "",
  });
  const business = await insertBusiness({
    userId: user.id,
    templateId: "home-services",
    name: "Composio Desk",
    slug: "composio-desk",
    city: "Austin",
    profileJson: "{}",
    orgoWorkspaceId: null,
    orgoComputerId: null,
    composioUserId: null,
    tregCustomerTag: null,
    provisionError: null,
  });
  const calls: string[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    calls.push(String(input));
    return new Response("{}", { status: 500 });
  };
  try {
    const outcome = await provisionComposioForBusiness(business.id);
    assert.equal(outcome.kind, "succeeded");
    assert.equal(calls.length, 0);
    const row = await getBusiness(business.id);
    assert.equal(row?.composioUserId, composioUserId(business.id));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("start connection stubs when composio key missing", async () => {
  const { createUser, insertBusiness, setBusinessComposioUserId } = await import("../store");
  const { composioUserId } = await import("./adapters");
  const { startBusinessConnection } = await import("./connections");
  const user = await createUser({ email: "composio-stub@cnstrct.local", name: "Stub" });
  const business = await insertBusiness({
    userId: user.id,
    templateId: "home-services",
    name: "Stub Desk",
    slug: `stub-desk-${Date.now()}`,
    city: "Austin",
    profileJson: "{}",
    orgoWorkspaceId: null,
    orgoComputerId: null,
    composioUserId: null,
    tregCustomerTag: null,
    provisionError: null,
  });
  await setBusinessComposioUserId(business.id, composioUserId(business.id));
  business.composioUserId = composioUserId(business.id);
  const result = await startBusinessConnection({ business, toolkit: "gmail", ownerUserId: user.id });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.status, 503);
    assert.equal(result.stub, true);
  }
});

test("callback completion verifies owner nonce and redeems session_uri", async () => {
  const {
    createUser,
    insertBusiness,
    insertComposioConnectionAttempt,
    listConnections,
    upsertConnection,
  } = await import("../store");
  const { composioUserId } = await import("./adapters");
  const { finishBusinessConnectionCallback } = await import("./connections");
  const user = await createUser({ email: "composio-cb@cnstrct.local", name: "Callback" });
  const stranger = await createUser({ email: "composio-other@cnstrct.local", name: "Other" });
  const business = await insertBusiness({
    userId: user.id,
    templateId: "home-services",
    name: "Callback Desk",
    slug: `callback-desk-${Date.now()}`,
    city: "Austin",
    profileJson: "{}",
    orgoWorkspaceId: null,
    orgoComputerId: null,
    composioUserId: null,
    tregCustomerTag: null,
    provisionError: null,
  });
  const bizId = business.id;
  const composioId = composioUserId(bizId);
  const { setBusinessComposioUserId } = await import("../store");
  await setBusinessComposioUserId(bizId, composioId);
  const now = Date.now();
  await insertComposioConnectionAttempt({
    id: "catt_1",
    businessId: bizId,
    toolkit: "gmail",
    composioUserId: composioId,
    nonce: "nonce-abc",
    sessionId: "sess_1",
    status: "pending",
    createdAt: now,
    expiresAt: now + 60_000,
  });
  await upsertConnection({ businessId: bizId, toolkit: "gmail", status: "not_connected", connectedAccountId: null });

  process.env.COMPOSIO_API_KEY = "ak_test_composio_lifecycle";
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.includes("/connected_accounts/complete_auth")) {
      assert.equal(init?.method, "POST");
      const body = JSON.parse(String(init?.body)) as { user_id: string; session_uri: string };
      assert.equal(body.user_id, composioId);
      assert.equal(body.session_uri, "https://connect.composio.dev/session/test");
      return new Response(
        JSON.stringify({ connected_account_id: "ca_test_1", toolkit_slug: "gmail" }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
    return new Response("{}", { status: 404 });
  };
  try {
    const denied = await finishBusinessConnectionCallback({
      businessId: bizId,
      ownerUserId: stranger.id,
      nonce: "nonce-abc",
      sessionUri: "https://connect.composio.dev/session/test",
    });
    assert.equal(denied.ok, false);

    const badNonce = await finishBusinessConnectionCallback({
      businessId: bizId,
      ownerUserId: user.id,
      nonce: "wrong",
      sessionUri: "https://connect.composio.dev/session/test",
    });
    assert.equal(badNonce.ok, false);

    const ok = await finishBusinessConnectionCallback({
      businessId: bizId,
      ownerUserId: user.id,
      nonce: "nonce-abc",
      sessionUri: "https://connect.composio.dev/session/test",
    });
    assert.equal(ok.ok, true);
    if (ok.ok) {
      assert.equal(ok.connectedAccountId, "ca_test_1");
    }
    const connections = await listConnections(bizId);
    assert.equal(connections[0]?.connectedAccountId, "ca_test_1");
    assert.equal(connections[0]?.status, "connected");
  } finally {
    delete process.env.COMPOSIO_API_KEY;
    globalThis.fetch = originalFetch;
  }
});

test("deprovision revokes accounts and deletes stored sessions", async () => {
  const { deprovisionComposioTenant } = await import("./composio");
  process.env.COMPOSIO_API_KEY = "ak_test_deprovision";
  const calls: { method: string; url: string }[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    calls.push({ method: init?.method ?? "GET", url });
    if (url.includes("/trigger_instances/active")) {
      return new Response(JSON.stringify({ items: [{ id: "ti_1" }] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (url.includes("/trigger_instances/manage/")) {
      return new Response("{}", { status: 200 });
    }
    if (url.includes("/connected_accounts/") && init?.method === "DELETE") {
      return new Response("{}", { status: 200 });
    }
    if (url.includes("/tool_router/session/")) {
      return new Response("{}", { status: 200 });
    }
    return new Response(JSON.stringify({ items: [] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
  try {
    const outcome = await deprovisionComposioTenant({
      composioUserId: "biz_biz_x:integration",
      connectedAccountIds: ["ca_x"],
      sessionIds: ["sess_x"],
    });
    assert.equal(outcome.ok, true);
    assert.ok(calls.some((call) => call.url.includes("ti_1") && call.method === "DELETE"));
    assert.ok(calls.some((call) => call.url.includes("ca_x") && call.method === "DELETE"));
    assert.ok(calls.some((call) => call.url.includes("sess_x") && call.method === "DELETE"));
  } finally {
    delete process.env.COMPOSIO_API_KEY;
    globalThis.fetch = originalFetch;
  }
});