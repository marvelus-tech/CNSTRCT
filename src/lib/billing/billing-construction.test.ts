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
delete process.env.STRIPE_PRICE_SCALE;

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
  const user = await createUser({ email: "unpaid@bizos.local", name: "Unpaid" });
  await saveProfile({ userId: user.id, ...profileBody });
  const gate = await constructionAccess(user.id);
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

  const user = await createUser({ email: "paid@bizos.local", name: "Paid" });
  await saveProfile({ userId: user.id, ...profileBody });
  await grantTestEntitlement(user.id, "starter");
  const gate = await constructionAccess(user.id);
  assert.equal(gate.ok, true);

  await openDesk(user.id, { userId: user.id, ...profileBody }, "home-services");
  const blocked = await constructionAccess(user.id);
  assert.equal(blocked.ok, false);
  if (!blocked.ok) assert.equal(blocked.code, "plan_limit");
});

test("production enforces payment when Stripe is configured", async () => {
  const prevTest = process.env.BILLING_TEST_MODE;
  const prevVercel = process.env.VERCEL_ENV;
  const prevMode = process.env.BILLING_MODE;
  delete process.env.BILLING_TEST_MODE;
  process.env.VERCEL_ENV = "production";
  process.env.BILLING_MODE = "bypass";
  process.env.STRIPE_SECRET_KEY = "sk_test_x";
  process.env.STRIPE_PRICE_STARTER = "price_starter";
  process.env.STRIPE_PRICE_PRO = "price_pro";
  process.env.STRIPE_PRICE_SCALE = "price_scale";
  const { createUser, saveProfile } = await import("../store");
  const { constructionAccess } = await import("./access");
  const user = await createUser({ email: "prod@bizos.local", name: "Prod" });
  await saveProfile({ userId: user.id, ...profileBody });
  const gate = await constructionAccess(user.id);
  assert.equal(gate.ok, false);
  if (!gate.ok) assert.equal(gate.code, "payment_required");
  process.env.BILLING_TEST_MODE = prevTest ?? "true";
  if (prevVercel === undefined) delete process.env.VERCEL_ENV;
  else process.env.VERCEL_ENV = prevVercel;
  if (prevMode === undefined) delete process.env.BILLING_MODE;
  else process.env.BILLING_MODE = prevMode;
  delete process.env.STRIPE_SECRET_KEY;
  delete process.env.STRIPE_PRICE_STARTER;
  delete process.env.STRIPE_PRICE_PRO;
  delete process.env.STRIPE_PRICE_SCALE;
});

test("scale entitlement allows a fourth business", async () => {
  const { createUser, saveProfile } = await import("../store");
  const { constructionAccess } = await import("./access");
  const { grantTestEntitlement } = await import("./entitlements");
  const { openDesk } = await import("../agent/provision");

  const user = await createUser({ email: "scale@bizos.local", name: "Scale" });
  await saveProfile({ userId: user.id, ...profileBody });
  await grantTestEntitlement(user.id, "scale");

  for (let i = 0; i < 4; i++) {
    assert.equal((await constructionAccess(user.id)).ok, true);
    await openDesk(user.id, { userId: user.id, ...profileBody }, "home-services");
  }
  assert.equal((await constructionAccess(user.id)).ok, true);
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