import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

process.env.CNSTRCT_DATA_DIR = mkdtempSync(path.join(tmpdir(), "cnstrct-kick-"));
delete process.env.ORGO_API_KEY;
delete process.env.COMPOSIO_API_KEY;

const profile = {
  userId: "",
  interests: "",
  skills: "",
  hasIdea: false,
  ideaText: "",
  space: "none" as const,
  capital: "none" as const,
  trades: "no" as const,
  location: "Austin",
  constraints: "",
};

test("kick after create advances composio job without duplicate businesses", async () => {
  const { createUser, getProvisioningJobsForBusiness, saveProfile } = await import("../store");
  const { openDesk } = await import("./provision");
  const { kickProvisioningAfterBusinessCreate } = await import("./provisioning");

  const user = await createUser({ email: "kick@cnstrct.local", name: "Kick" });
  const local = { ...profile, userId: user.id };
  await saveProfile(local);
  const desk = await openDesk(user.id, local, "home-services", "kick-key-01");

  kickProvisioningAfterBusinessCreate();
  await new Promise((resolve) => setTimeout(resolve, 50));

  const jobs = await getProvisioningJobsForBusiness(desk.business.id);
  const composio = jobs.find((job) => job.provider === "composio");
  assert.ok(composio);
  assert.equal(composio?.status, "succeeded");
});