import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

process.env.BILLING_TEST_MODE = "true";
process.env.CNSTRCT_DATA_DIR = mkdtempSync(path.join(tmpdir(), "bizos-billing-"));
delete process.env.VERCEL_ENV;
delete process.env.BILLING_MODE;
delete process.env.STRIPE_SECRET_KEY;
delete process.env.STRIPE_PRICE_STARTER;
delete process.env.STRIPE_PRICE_PRO;

const profileBody = {
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

test("construction blocks unpaid users in billing test mode", async () => {
  const { createUser, saveProfile } = await import("../store");
  const { constructionAccess } = await import("./access");
  const user = createUser({ email: "unpaid@bizos.local", name: "Unpaid" });
  saveProfile({ userId: user.id, ...profileBody });
  const gate = constructionAccess(user.id);
  assert.equal(gate.ok, false);
  if (!gate.ok) {
    assert.equal(gate.code, "payment_required");
    assert.equal(gate.status, 402);
  }
});

test("construction allows paid starter and enforces business limit", async () => {
  const { createUser, saveProfile } = await import("../store");
  const { constructionAccess } = await import("./access");
  const { grantTestEntitlement } = await import("./entitlements");
  const { openDesk } = await import("../agent/provision");

  const user = createUser({ email: "paid@bizos.local", name: "Paid" });
  saveProfile({ userId: user.id, ...profileBody });
  grantTestEntitlement(user.id, "starter");
  const gate = constructionAccess(user.id);
  assert.equal(gate.ok, true);

  await openDesk(user.id, { userId: user.id, ...profileBody }, "home-services");
  const blocked = constructionAccess(user.id);
  assert.equal(blocked.ok, false);
  if (!blocked.ok) assert.equal(blocked.code, "plan_limit");
});

test("construction fails closed without Stripe keys or billing test mode", async () => {
  const prevTest = process.env.BILLING_TEST_MODE;
  const prevVercel = process.env.VERCEL_ENV;
  const prevMode = process.env.BILLING_MODE;
  delete process.env.BILLING_TEST_MODE;
  process.env.VERCEL_ENV = "production";
  process.env.BILLING_MODE = "bypass";
  delete process.env.STRIPE_SECRET_KEY;
  delete process.env.STRIPE_PRICE_STARTER;
  delete process.env.STRIPE_PRICE_PRO;
  const { createUser } = await import("../store");
  const { constructionAccess } = await import("./access");
  const user = createUser({ email: "prod@bizos.local", name: "Prod" });
  const gate = constructionAccess(user.id);
  assert.equal(gate.ok, false);
  if (!gate.ok) assert.equal(gate.code, "payments_not_configured");
  process.env.BILLING_TEST_MODE = prevTest ?? "true";
  if (prevVercel === undefined) delete process.env.VERCEL_ENV;
  else process.env.VERCEL_ENV = prevVercel;
  if (prevMode === undefined) delete process.env.BILLING_MODE;
  else process.env.BILLING_MODE = prevMode;
});

test("opportunity recommendations stay available without billing", async () => {
  const { opportunityCardsForProfile } = await import("../opportunity-cards");
  const { parseProfile } = await import("../profile");
  const parsed = parseProfile("preview", profileBody);
  assert.ok(!("error" in parsed));
  const cards = opportunityCardsForProfile(parsed);
  assert.equal(cards.length, 3);
  assert.equal(cards.filter((c) => c.live).length, 2);
});