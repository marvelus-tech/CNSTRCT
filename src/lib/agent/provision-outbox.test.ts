import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

process.env.CNSTRCT_DATA_DIR = mkdtempSync(path.join(tmpdir(), "cnstrct-provision-"));
delete process.env.ORGO_API_KEY;
delete process.env.TREG_TOKEN;
delete process.env.TREG_ORG_ID;
delete process.env.COMPOSIO_API_KEY;
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

test("duplicate POST with the same idempotency key returns one business", async () => {
  const { createUser, getBusinessByCreateIdempotencyKey, saveProfile } = await import("../store");
  const { openDesk } = await import("./provision");
  const user = await createUser({ email: "idem@cnstrct.local", name: "Idem" });
  const local = { ...profile, userId: user.id };
  await saveProfile(local);
  const key = "client-key-001";
  const first = await openDesk(user.id, local, "home-services", key);
  const second = await openDesk(user.id, local, "mobile-detailing", key);
  assert.equal(first.business.id, second.business.id);
  const stored = await getBusinessByCreateIdempotencyKey(user.id, key);
  assert.equal(stored?.id, first.business.id);
});

test("business create enqueues three provisioning jobs without provider fetch", async () => {
  const { createUser, getProvisioningJobsForBusiness, saveProfile } = await import("../store");
  const { composioUserId, tregCustomerTag } = await import("./adapters");
  const { openDesk } = await import("./provision");
  const user = await createUser({ email: "jobs@cnstrct.local", name: "Jobs" });
  const local = { ...profile, userId: user.id };
  await saveProfile(local);
  const calls: string[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    calls.push(String(input));
    return { ok: true, status: 200, text: async () => "{}" } as Response;
  }) as typeof fetch;
  try {
    const desk = await openDesk(user.id, local);
    assert.equal(calls.length, 0);
    const jobs = await getProvisioningJobsForBusiness(desk.business.id);
    assert.equal(jobs.length, 3);
    assert.deepEqual(
      jobs.map((job) => job.provider).sort(),
      ["composio", "orgo", "treg"],
    );
    assert.equal(desk.business.composioUserId, composioUserId(desk.business.id));
    assert.equal(desk.business.tregCustomerTag, tregCustomerTag(desk.business.id));
  } finally {
    globalThis.fetch = original;
  }
});

test("worker records composio success and does not leak secrets", async () => {
  const { createUser, getBusiness, getProvisioningJobsForBusiness, saveProfile } = await import("../store");
  const { openDesk } = await import("./provision");
  const { runProvisioningWorkerPass } = await import("./provisioning");
  const user = await createUser({ email: "worker@cnstrct.local", name: "Worker" });
  const local = { ...profile, userId: user.id };
  await saveProfile(local);
  const desk = await openDesk(user.id, local);
  process.env.TREG_TOKEN = "supersecret-treg-token-value";
  process.env.TREG_ORG_ID = "org_test";
  try {
    const result = await runProvisioningWorkerPass();
    assert.ok(result.claimed >= 1);
    const jobs = await getProvisioningJobsForBusiness(desk.business.id);
    const composio = jobs.find((job) => job.provider === "composio");
    assert.equal(composio?.status, "succeeded");
    const business = await getBusiness(desk.business.id);
    assert.ok(business);
    const serialized = JSON.stringify({ business, jobs });
    assert.equal(serialized.includes("supersecret-treg-token-value"), false);
    assert.equal((business.provisionError ?? "").includes("supersecret"), false);
  } finally {
    delete process.env.TREG_TOKEN;
    delete process.env.TREG_ORG_ID;
  }
});

test("redact strips postgres urls and bearer tokens", async () => {
  const { redactProvisioningError } = await import("./redact");
  const sample = "failed postgres://user:pass@host/db with Bearer sk_live_abc";
  const out = redactProvisioningError(sample);
  assert.match(out, /postgres:\/\/\[redacted\]/);
  assert.match(out, /Bearer \[redacted\]/);
  assert.doesNotMatch(out, /sk_live_abc/);
});