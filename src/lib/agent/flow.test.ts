import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

process.env.CNSTRCT_DATA_DIR = mkdtempSync(path.join(tmpdir(), "cnstrct-"));
delete process.env.ORGO_API_KEY;
delete process.env.ORGO_WORKSPACE_ID;
delete process.env.XAI_API_KEY;
delete process.env.OPENAI_API_KEY;

const profile = {
  userId: "",
  interests: "woodworking",
  skills: "talking to neighbors",
  hasIdea: true,
  ideaText: "a cookie stand",
  space: "corner" as const,
  capital: "none" as const,
  trades: "maybe" as const,
  location: "Austin, TX",
  constraints: "weeknights",
};

test("desk sweep asks before send and can be refused", async () => {
  const { createUser, getProfile, listRows, saveProfile } = await import("../store");
  const { openDesk } = await import("./provision");
  const { execInSandbox, sandboxRoot } = await import("./sandbox");
  const { liveCardCopy } = await import("../copy");
  const fs = await import("node:fs");
  const user = createUser({ email: "owner@cnstrct.local", name: "Owner" });
  profile.userId = user.id;
  saveProfile(profile);
  const card = liveCardCopy(getProfile(user.id)!);
  assert.match(card.summary, /Austin/);
  assert.match(card.summary, /basically no cash/);
  assert.match(card.summary, /cookie stand/);

  const desk = await openDesk(user.id, profile);
  assert.equal(desk.business.name, "Austin Home Match");
  assert.equal(desk.business.city, "Austin");
  assert.equal(desk.agents.length, 3);
  assert.equal(desk.agents.filter((agent) => agent.role === "orchestrator").length, 1);
  assert.equal(listRows(desk.agents[0]!.id).some((row) => row.kind === "card"), false);

  const scout = desk.agents.find((agent) => agent.role === "scout")!;
  const blocked = await execInSandbox(scout.id, "curl https://example.com");
  assert.equal(blocked.exitCode, 126);
  assert.match(blocked.output, /blocked/i);
  assert.equal(fs.existsSync(path.join(sandboxRoot(scout.id), "outbox", "outreach.json")), false);
});

test("mobile detailing desk provisions Riley and Sam", async () => {
  const { createUser, saveProfile } = await import("../store");
  const { openDesk } = await import("./provision");
  const { detailingCardCopy } = await import("../copy");
  const { TEMPLATES } = await import("../templates");

  const user = createUser({ email: "detail@cnstrct.local", name: "Detailer" });
  const local = { ...profile, userId: user.id, location: "Austin, TX" };
  saveProfile(local);
  const card = detailingCardCopy(local);
  assert.match(card.summary, /Driveway Detail/);
  assert.equal(TEMPLATES.find((t) => t.id === "mobile-detailing")?.live, true);

  const desk = await openDesk(user.id, local, "mobile-detailing");
  assert.equal(desk.business.templateId, "mobile-detailing");
  assert.equal(desk.business.name, "Austin Driveway Detail");
  assert.deepEqual(
    desk.agents.map((agent) => agent.name).sort(),
    ["Bizzie", "Riley", "Sam"],
  );
});

test("openDesk stores profile_json and allows multiple desks per template", async () => {
  const { createUser, saveProfile } = await import("../store");
  const { openDesk } = await import("./provision");

  const user = createUser({ email: "multi@cnstrct.local", name: "Multi" });
  const local = { ...profile, userId: user.id };
  saveProfile(local);

  const first = await openDesk(user.id, local, "home-services");
  const second = await openDesk(user.id, local, "home-services");

  assert.notEqual(first.business.id, second.business.id);
  assert.equal(first.agents.length, 3);
  assert.equal(second.agents.length, 3);
  assert.ok(first.business.profileJson);
  assert.match(first.business.profileJson!, /Austin/);

  const detailing = await openDesk(user.id, local, "mobile-detailing");
  assert.notEqual(detailing.business.id, first.business.id);
});
