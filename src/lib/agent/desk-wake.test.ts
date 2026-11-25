import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

process.env.CNSTRCT_DATA_DIR = mkdtempSync(path.join(tmpdir(), "cnstrct-wake-"));
delete process.env.DATABASE_URL;

test("wakeBusinessDesk resumes stopped Orgo computer", async () => {
  const { createUser, insertBusiness, saveProfile } = await import("../store");
  const { wakeBusinessDesk } = await import("./desk-wake");
  const computerId = "comp_wake_1";
  const calls: string[] = [];
  const original = globalThis.fetch;
  process.env.ORGO_API_KEY = "sk_test_orgo_wake";

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    calls.push(`${method} ${url}`);
    if (method === "GET" && url.endsWith(`/computers/${computerId}`)) {
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ id: computerId, status: "stopped" }),
      } as Response;
    }
    if (method === "POST" && url.endsWith(`/computers/${computerId}/resume`)) {
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ id: computerId, status: "running" }),
      } as Response;
    }
    return { ok: false, status: 404, text: async () => "{}" } as Response;
  }) as typeof fetch;

  try {
    const user = await createUser({ email: "wake@cnstrct.local", name: "Wake" });
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
    const business = await insertBusiness({
      userId: user.id,
      templateId: "home-services",
      name: "Wake Co",
      slug: "wake-co",
      city: "Austin",
      profileJson: null,
      orgoWorkspaceId: "ws_test",
      orgoComputerId: computerId,
      composioUserId: null,
      tregCustomerTag: null,
      createIdempotencyKey: null,
    });

    const result = await wakeBusinessDesk(business.id);
    if (!result.ok) assert.fail(`expected wake ok, got: ${result.error}`);
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.action, "wake");
      assert.match(result.status, /running|resumed/i);
    }
    const serialized = JSON.stringify({ calls });
    assert.equal(serialized.includes("sk_test_orgo_wake"), false);
  } finally {
    globalThis.fetch = original;
    delete process.env.ORGO_API_KEY;
  }
});