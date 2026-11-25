import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

process.env.CNSTRCT_DATA_DIR = mkdtempSync(path.join(tmpdir(), "cnstrct-desk-ready-"));
delete process.env.DATABASE_URL;

test("pending to ready sends desk email once", async () => {
  const { refreshBusinessProvisionStatus } = await import("../agent/provisioning");
  const { PROVISIONING_PROVIDERS } = await import("../agent/provisioning");
  const { createUser, insertBusinessWithProvisioningJobs, saveProfile, getProvisioningJobsForBusiness, updateProvisioningJobResult, hasAuditKind } =
    await import("../store");
  const { composioUserId, tregCustomerTag } = await import("../agent/adapters");
  const { DESK_READY_AUDIT_KIND } = await import("./desk-ready");

  const { resendTestState } = await import("./send");
  const calls: { to: string[] }[] = [];
  const prevFetch = resendTestState.fetch;
  resendTestState.fetch = (async (_input, init) => {
    const body = JSON.parse(String(init?.body)) as { to: string[] };
    calls.push(body);
    return {
      ok: true,
      status: 200,
      json: async () => ({ id: "email_test_id" }),
    } as Response;
  }) as typeof fetch;

  const prevKey = process.env.RESEND_API_KEY;
  const prevFrom = process.env.EMAIL_FROM;
  process.env.RESEND_API_KEY = "re_test";
  process.env.EMAIL_FROM = "BizOS <hello@example.com>";

  try {
    const user = await createUser({ email: "owner@example.com", name: "Owner" });
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
    const bizId = "biz_desk_ready_mail";
    await insertBusinessWithProvisioningJobs(
      {
        id: bizId,
        userId: user.id,
        templateId: "home-services",
        name: "Ready Co",
        slug: "ready-co",
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
      [...PROVISIONING_PROVIDERS],
    );

    const jobs = await getProvisioningJobsForBusiness(bizId);
    const now = Date.now();
    for (const job of jobs) {
      await updateProvisioningJobResult(job.id, {
        status: "succeeded",
        nextAttemptAt: now,
        leasedUntil: null,
        lastError: null,
        attempts: 1,
      });
    }

    await refreshBusinessProvisionStatus(bizId);
    assert.equal(calls.length, 1);
    assert.equal(calls[0]?.to[0], "owner@example.com");
    assert.equal(await hasAuditKind(bizId, DESK_READY_AUDIT_KIND), true);

    await refreshBusinessProvisionStatus(bizId);
    assert.equal(calls.length, 1);
  } finally {
    resendTestState.fetch = prevFetch;
    if (prevKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = prevKey;
    if (prevFrom === undefined) delete process.env.EMAIL_FROM;
    else process.env.EMAIL_FROM = prevFrom;
  }
});

test("demo cnstrct.local email is skipped", async () => {
  const { ownerEmailDeliverable } = await import("./desk-ready");
  assert.equal(ownerEmailDeliverable("demo@cnstrct.local"), false);
  assert.equal(ownerEmailDeliverable("real@acme.test"), true);
});